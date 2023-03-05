import { createLogger } from "logger";
import { createTCPForwarder, createUDPForwarder } from "./createForwarder";

const log = createLogger("Main");

const getTF2ConnectionCountUDP = createUDPForwarder({ port: 27015, serverPort: 27015, serverAdress: "192.168.10.54" });
const getMCConnectionCountTCP = createTCPForwarder({ port: 25565, serverPort: 25565, serverAdress: "192.168.10.54" });

const main = async () => {
    setInterval(() => {
        log(getTF2ConnectionCountUDP(), getMCConnectionCountTCP())
    }, 1000)
}

main();