const REMOTE_SERVER = "https://127.0.0.1:7000";

let isPushEnabled = false;
let useNotifications = false;

let subBtn = <HTMLButtonElement>document.querySelector(".subscribe");
let sendBtn: HTMLButtonElement;
let sendInput: HTMLInputElement;

let controlsBlock = document.querySelector(".controls");
let subscribersList: HTMLUListElement = <HTMLUListElement>document.querySelector(".subscribers ul");
let messagesList: HTMLUListElement = <HTMLUListElement>document.querySelector(".messages ul");

let nameForm: HTMLFormElement = <HTMLFormElement>document.querySelector("#form");
let nameInput: HTMLInputElement = <HTMLInputElement>document.querySelector("#name-input");

nameForm.onsubmit = (event: Event) => { event.preventDefault(); };

Notification.requestPermission((answer) => {
    if (answer === "denied") {
        console.log("Permission wasn't granted. Allow a retry.");
        return;
    }

    if (answer === "default") {
        console.log("The Permission request was dismissed.");
        return;
    }
    console.log("Permission was granted.");
});

window.addEventListener("load", () => {
    subBtn.addEventListener("click", () => {
        if (isPushEnabled) {
            unsubscribe();
        } else {
            subscribe();
        }
    });

    // Check that service workers are supported, if so, progressively
    // enhance and add push messaging support, otherwise continue without it.
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("serviceWorker.js").then(reg => {
            if (reg.installing) {
                console.log("Service worker installing");
            } else if (reg.waiting) {
                console.log("Service worker installed");
            } else if (reg.active) {
                console.log("Service worker active");
            }

            initialiseState(reg);
        });
    } else {
        console.log("Service workers aren't supported in this browser.");
    }
});

// Once the service worker is registered set the initial state
function initialiseState(reg) {
    // Are Notification supported in the service worker?
    if (!reg.showNotification) {
        console.log("Notification aren't supported on service workers.");
        useNotifications = false;
    } else {
        useNotifications = true;
    }

    // Check the current Notification permission.
    // If its denied, it's a permanent block until the
    // user changes the permission
    if (Notification.permission === "denied") {
        console.log("The user has blocked notifications.");
        return;
    }

    // Check if push messaging is supported
    if (!("PushManager" in window)) {
        console.log("Push messaging isn't supported.");
        return;
    }

    // We need the service worker registration to check for a subscription
    navigator.serviceWorker.ready.then(reg => {
        // Do we already have a push message subscription?
        reg.pushManager.getSubscription()
            .then(subscription => {
                // Enable any UI which subscribes/unsubscribes from push messages

                subBtn.disabled = false;

                if (!subscription) {
                    console.log("Not yet subscribed to Push");
                    // We aren't subscribed to push, so set UI to allow the
                    // user to enable push
                    return;
                }

                // Set your UI to show they have subscribed for push messages
                subBtn.textContent = "Unsubscribe from Push Messaging";
                isPushEnabled = true;

                // Initialize status, which includes setting UI elements for subscribed
                // status and updating Subscribers list via push
                console.log("PushSubscription: ", subscription.toJSON());
                updateStatus(subscription, "init");
            })
            .catch(err => {
                console.log("Error during getSubscription()", err);
            });

            // Set up a message channel to communicate with the SW
            let channel = new MessageChannel();
            channel.port1.onmessage = e => {
                console.log(e);
                handleChannelMessage(e.data);
            };

            reg.active.postMessage("hello", [channel.port2]);
    });
}

function subscribe() {
    // Should check duplicated names

    // Disable the button so it can't be changed while
    // we process the permission request
    subBtn.disabled = true;

    navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.subscribe({ userVisibleOnly: true })
            .then(subscription => {
                // The subscription was successful
                isPushEnabled = true;
                subBtn.textContent = "Unsubscribe from Push Messaging";
                subBtn.disabled = false;

                // Update status to subscribe current user on server, and to let
                // other users know this user has subscribed
                updateStatus(subscription, "subscribe");
            })
            .catch(e => {
                if (Notification.permission === "denied") {
                    // The user denied the notification permission which
                    // means we failed to subscribe and the user will need
                    // to manually change the notification permission to
                    // subscribe to push messages
                    console.log("Permission for Notifications was denied");
                } else {
                    // A problem occurred with the subscription, this can
                    // often be down to an issue or lacke of the gcm_sender_id
                    // and / or gcm_user_visible_only
                    console.log("Unable to subscribe to push.", e);
                    subBtn.disabled = false;
                    subBtn.textContent = "Subscribe to Push Messaging";
                }
            });
    });
}

function unsubscribe() {
    subBtn.disabled = true;

    navigator.serviceWorker.ready.then(reg => {
        // To unsubscribe from push messaging, you need get the
        // subscription object, which you can call unsubscribe() on.
        reg.pushManager.getSubscription().then(subscription => {
            // Update status to unsubscribe current user from server
            // and let other subscribers kown they have unsubscribed
            updateStatus(subscription, "unsubscribe");

            // Check we have a subscription to unsubscribe
            if (!subscription) {
                // No subscription object, so set the state
                // to allow the user to subscribe to push
                isPushEnabled = false;
                subBtn.disabled = false;
                subBtn.textContent = "Subscribe to Push Messaging";
                return;
            }

            isPushEnabled = false;

            // setTimeout used to stop unsubscribe being called before the message
            // has been sent to everyone to tell them that the unsubscription has
            // occurred, including the person unsubscribing. This is a dirty hack,
            // and I'm probably going to hell for writing this.
            setTimeout(() => {
                // We have a subscription, so call unsubscribe on it
                subscription.unsubscribe().then(successful => {
                    subBtn.disabled = false;
                    subBtn.textContent = "Subscribe to Push Messaging";
                    isPushEnabled = false;
                }).catch(e => {
                    // We failed to unsubscribe, this can lead to
                    // an unusual state, so may be best to remove
                    // the subscription id from your data store and
                    // inform the user that you disabled push
                    console.log("Unsubscription error: ", e);
                    subBtn.disabled = false;
                });
            }, 3000);
        }).catch(e => {
            console.log("Error thrown while unsubscribing from push messaging.", e);
        });
    });
}

function postSubscribeObj(subscription, statusType) {
    // Create a new XHR and send an array to the server containing
    // the type of the request, the name of the user subscribing,
    // and the push subscription endpoint + key the server needs
    // to send push messages
    let request = new XMLHttpRequest();

    request.open("POST", REMOTE_SERVER);
    request.setRequestHeader("Content-Type", "application/json");

    let subscribeObj = {
        username: nameInput.value,
        statusType: statusType,
        subscription: subscription.toJSON()
    };
    console.log("Send subscription to server: ", subscribeObj);
    request.send(JSON.stringify(subscribeObj));
}

function updateStatus(subscription, statusType) {
    console.log(`updateStatus, endpoint: ${subscription.endpoint}`);

    // If we are subscribing to push
    if (statusType === "subscribe" || statusType === "init") {
        // Create the input and button to allow sending messages
        sendBtn = document.createElement("button");
        sendInput = document.createElement("input");

        sendBtn.textContent = "Send Chat Message";
        sendInput.setAttribute("type", "text");
        controlsBlock.appendChild(sendBtn);
        controlsBlock.appendChild(sendInput);

        // Set up a listener so that when the Send Chat Message button is  clicked,
        // the sendChatMessage() function is fun, which handles sending the message
        sendBtn.onclick = () => { sendChatMessage(sendInput.value); };

        postSubscribeObj(subscription, statusType);
    } else if (statusType === "unsubscribe") {
        controlsBlock.removeChild(sendBtn);
        controlsBlock.removeChild(sendInput);
        postSubscribeObj(subscription, statusType);
    }
}

function handleChannelMessage(data) {
    if (data.action === "subscribe" || data.action === "init") {
        const listItem = document.createElement("li");
        listItem.textContent = data.name;
        subscribersList.appendChild(listItem);
    } else if (data.action === "unsubscribe") {
        for (let i = 0; i < subscribersList.children.length; i++) {
            const children = subscribersList.children[i];
            if (children.textContent === data.name) {
                children.parentNode.removeChild(children);
            }
        }
        nameInput.disabled = false;
    } else if (data.action === "chatMsg") {
        const listItem = document.createElement("li");
        listItem.textContent = `${data.name}: ${data.msg}`;
        messagesList.appendChild(listItem);
        sendInput.value = "";
    }
}

function sendChatMessage(chatMsg: string) {
    navigator.serviceWorker.ready.then(reg => {
        // Find push message subscription, the retrieve it
        reg.pushManager.getSubscription().then(subscription => {
            // Create a new XHR and send an object to the server containing
            // the type of the request, the name of the user unsubscribing,
            // and the associated push subscription
            const request = new XMLHttpRequest();
            request.open("POST", REMOTE_SERVER);
            request.setRequestHeader("Content-Type", "application/json");

            const messageObj = {
                statusType: "chatMsg",
                username: nameInput.value,
                subscription: subscription,
                msg: chatMsg
            };
            console.log(messageObj);
            request.send(JSON.stringify(messageObj));
        });
    });
}
