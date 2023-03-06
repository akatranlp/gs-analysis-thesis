import { createLogger } from "logger";
import { createTCPForwarder, createUDPForwarder } from "./createForwarder";

const log = createLogger("Main");

const tf2Forwarder = createUDPForwarder({ name: "tf2", port: 27015, serverAddress: "192.168.10.54", serverPort: 27015 });
const mcForwarder = createTCPForwarder({ name: "mc", port: 25565, serverAddress: "192.168.10.54", serverPort: 25565 });

const main = async () => {
    setInterval(() => {
        log(tf2Forwarder.getConnectionCount(), mcForwarder.getConnectionCount())
    }, 1000);
}

main();