let port;

self.onmessage = e => {
    console.log(e);
    port = e.ports[0];
};

self.addEventListener("push", event => {
    const obj = event.data.json();

    if (obj.action === "subscribe" || obj.action === "unsubscribe") {
        const title = "Subscription change";
        event.waitUntil(self.registration.showNotification(title, {
            body: `${obj.name} has ${obj.action}d`,
            icon: "push-icon.png",
            tag: "push"
        }));
        port.postMessage(obj);

    } else if (obj.action === "chatMsg") {
        const title = `${obj.name} say:`;
        event.waitUntil(self.registration.showNotification(title, {
            body: obj.msg,
            icon: "push-icon.png",
            tag: "push"
        }));
        port.postMessage(obj);

    } else if (obj.action === "init") {
        port.postMessage(obj);
    }
});
