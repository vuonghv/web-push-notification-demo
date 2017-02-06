import * as express from "express";
import * as fs from "fs";
import * as https from "https";
import * as serveStatic from "serve-static";
import * as webPush from "web-push";

interface PushSubscription {
    endpoint: string;
    keys: {
        auth: string;
        p256dh: string;
    };
}

interface SubscriptionObj {
    subscription: PushSubscription;
    statusType: string;
    username: string;
    msg?: string;
}

const options = {
    pfx: fs.readFileSync("deadpool.pfx"),
    passphrase: "password"
};

let dupe = "true";

const app = express();

app.use(serveStatic(__dirname, { index: false }));

app.post("/", (req: express.Request, res: express.Response) => {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
        if (!body) return;
        const obj = <SubscriptionObj>JSON.parse(body);
        console.log(`POSTED: ${obj.statusType}`);

        if (obj.statusType === "chatMsg") {
            fs.readFile("endpoint.txt", (err, buffer) => {
                let lines = buffer.toString().split("\n");
                for (let i = 0; i < (lines.length - 1); i++) {
                    const subscriptionObj: SubscriptionObj = JSON.parse(lines[i]);
                    webPush.sendNotification(subscriptionObj.subscription, JSON.stringify({
                        action: "chatMsg",
                        name: obj.username,
                        msg: obj.msg
                    }));
                }
            });

        } else if (obj.statusType === "init") {
            fs.readFile("endpoint.txt", (err, buffer) => {
                if (!buffer) {
                    console.log("endpoint.txt is empty");
                    return;
                }
                let lines = buffer.toString().split("\n");
                for (let i = 0; i < (lines.length - 1); i++) {
                    const subscriptionObj: SubscriptionObj = JSON.parse(lines[i]);
                    webPush.sendNotification(subscriptionObj.subscription, JSON.stringify({
                        action: "init",
                        name: subscriptionObj.username
                    }));
                }
            });

        } else if (obj.statusType === "subscribe") {
            const subscriptionData = JSON.stringify(obj) + "\n";
            fs.appendFile("endpoint.txt", subscriptionData, err => {
                if (err) throw err;
                fs.readFile("endpoint.txt", (err, buffer) => {
                    let lines = buffer.toString().split("\n");
                    for (let i = 0; i < (lines.length - 1); i++) {
                        const subscriptionObj: SubscriptionObj = JSON.parse(lines[i]);
                        webPush.sendNotification(obj.subscription, JSON.stringify({
                            action: "subscribe",
                            name: subscriptionObj.username
                        }));
                    }
                });
            });

        } else if (obj.statusType === "unsubscribe") {
            fs.readFile("endpoint.txt", (err, buffer) => {
                let newString = "";
                const lines = buffer.toString().split("\n");
                for (let i = 0; i < (lines.length - 1); i++) {
                    const subscriptionObj: SubscriptionObj = JSON.parse(lines[i]);
                    console.log(`Unsubscribe: ${subscriptionObj.username}`);

                    webPush.sendNotification(subscriptionObj.subscription, JSON.stringify({
                        action: "unsubscribe",
                        name: subscriptionObj.username
                    }));

                    if (obj.subscription.endpoint === subscriptionObj.subscription.endpoint) {
                        console.log("subscriber found.");
                    } else {
                        newString += lines[i] + "\n";
                    }

                    fs.writeFile("endpoint.txt", newString, err => { if (err) throw err; });
                }
            });
        }
    });

    res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Origin, Access-Control-Allow-Headers"
    });

    res.write(dupe);
    res.end();
});

const httpsServer = https.createServer(options, app);
httpsServer.listen(7000);
console.log("Server running on 7000");
