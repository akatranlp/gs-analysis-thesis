import { RconClient, RconClientOptions } from "rcon";
import { SSHClient } from "ssh-playercount";

interface Game {
    "rconListPlayerCommand": string
    "rconConvertPlayerCountFunction": (data: string) => number
}

type GameMap = Record<string, Game>

const map: GameMap = {
    mc: {
        rconListPlayerCommand: "list",
        rconConvertPlayerCountFunction: (data) => parseInt(data.match(/\d/)?.[0] || "0")
    },
    tf2: {
        rconListPlayerCommand: "users",
        rconConvertPlayerCountFunction: (data) => parseInt(data.split("\n").at(-2) || "0")
    },
    conan: {
        rconListPlayerCommand: "listplayers",
        rconConvertPlayerCountFunction: (data) => data.match(/\n/)?.length || 0
    },
    ttt: {
        rconListPlayerCommand: "ttt_print_playercount",
        rconConvertPlayerCountFunction: (data) => {
            console.log(data)
            return 0
        }
    }
}

const main2 = async () => {
    //const rconMC = new RconClient({ host: "192.168.10.54", port: 25575, password: "petersenhecker" });
    //const rconTF2 = new RconClient({ host: "192.168.10.54", port: 27015, password: "petersenhecker" });
    //const rconTTT = new RconClient({ host: "192.168.10.54", port: 27016, password: "adminSJgtcpug" });
    const rconConan = new RconClient({ host: "192.168.10.12", port: 27016, password: "petersenhecker" });


    await rconConan.connect();
    let response = await rconConan.sendCommand("listplayers");
    console.log(response)
    await rconConan.disconnect();

}

const main = async () => {
    const args = process.argv;
    if (args.length < 6) {
        console.error("not enough arguments");
        return;
    }
    const options: RconClientOptions = {
        host: args[2],
        port: parseInt(args[3]),
        password: args[4]
    }
    const rcon = new RconClient(options);
    await rcon.connect();
    console.log(await rcon.sendCommand(args[5]));
    await rcon.disconnect();
}



const main3 = async () => {
    const ssh = new SSHClient({ host: "192.168.10.54", username: "fabian", password: "Guerrocombatre01" }, { port: 25565 });
    await ssh.connect();
    const response = await ssh.getPlayerCount();
    console.log(response)
}

main3();