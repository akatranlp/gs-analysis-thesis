import { createLogger } from "logger";
import PromiseSocket from "promise-socket";
import { delay } from "utils";
import { createRCONMessageBuffer, readRCONMessageBuffer } from "./rconClient";



const log = createLogger("Main");

const main = async () => {
    const promiseSocket = new PromiseSocket();
    //await promiseSocket.connect(27015, "192.168.10.54"); // tf2
    await promiseSocket.connect(25575, "192.168.10.54"); // mc
    //await promiseSocket.connect(27016, "192.168.10.12"); // conan

    console.log("Send auth Package with ID 500!")
    await promiseSocket.write(createRCONMessageBuffer({ id: 500, type: 3, body: "petersenhecker" }));

    for await (const response of promiseSocket) {
        console.log("Received Package from Conan: ")
        const paket = readRCONMessageBuffer(response as Buffer)
        console.log(paket);
        if (paket.type === 2) break;
    }


    console.log("Send Command Package with ID 7000!")
    await promiseSocket.write(createRCONMessageBuffer({ id: 7000, type: 2, body: "help" }));

    let response = await promiseSocket.read()
    console.log(readRCONMessageBuffer(response as Buffer))
    await delay(10)
    await promiseSocket.write(createRCONMessageBuffer({ id: 1000, type: 2, body: "list" }));
    response = await promiseSocket.read()
    console.log(readRCONMessageBuffer(response as Buffer))
}


main();