import { RconClient, RconClientOptions } from "rcon";
import { SSHClient } from "ssh-playercount";
import { createLogger } from "logger";
import { delay } from "utils";

const log = createLogger("Main");

const main = async () => {
    const rcon = new RconClient({ host: "192.168.10.12", port: 27016, password: "petersenhecker" });
    await rcon.connect();

    const response = await rcon.sendCommand("listplayers");
    log(response);
}

const main2 = async () => {
    //const ssh = new SSHClient({ host: "192.168.10.54", username: "fabian", password: "Guerrocombatre01" }, { port: 25565, interface: "enp3s0" });
    const ssh = new SSHClient({ host: "192.168.10.54", username: "fabian", password: "Guerrocombatre01" }, { port: 27015, interface: "enp3s0" });
    await ssh.connect();

    await ssh.getPlayerCount();
    await delay(2000);
    const playerCount = await ssh.getPlayerCount();
    await ssh.disconnect();

    log(playerCount);
}

const test = async () => {
    await delay(2000)
    return 1
}

const main3 = async () => {
    const test2 = {
        test: test()
    }

    const promises: Promise<Record<string, number>>[] = []
    for (const [key, value] of Object.entries(test2)) {
        promises.push(new Promise(async res => res({ [key]: await value })))
    }

    const values = await Promise.all(promises);
    console.log(values);
}

main3();