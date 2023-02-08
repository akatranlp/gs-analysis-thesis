import { HostServerInfo, GameServerInfo, RconGameServerInfo } from "./serverInfo";
import { OldRconClient } from "rcon";
import { SSHClient } from "ssh-playercount";
import { NodeSSH } from "node-ssh";
import Docker, { DockerOptions } from "dockerode";
import { PromiseSocket } from "promise-socket";

export interface StatusInfo {
    isOnline: boolean
    isInactive: boolean
    name: string,
    type: "hw" | "gs"
    playerCount: number | null
    maxPlayers: number | null
    rcon: boolean | null
    childrenInfo: StatusInfo[] | null
}

export class HostServer {
    private children: (GameServer | HostServer)[] = [];
    dockerClient: Docker | null = null;
    private sshClient = new NodeSSH();

    constructor(
        private hostServerInfo: HostServerInfo,
        private hostServer: HostServer | null
    ) {
        if (hostServerInfo.dockerInstalled) {
            this.dockerClient = new Docker({
                protocol: "ssh",
                host: hostServerInfo.ipAdress,
                port: 22,
                username: hostServerInfo.username,
                password: hostServerInfo.password
            } as DockerOptions)
        }
    }

    async isOnline(hostIsOnline: boolean | null) {
        if (hostIsOnline === false) {
            return false;
        } else if (hostIsOnline == null) {
            if (this.hostServer && !await this.hostServer.isOnline(null)) {
                return false;
            }
        }

        const socket = new PromiseSocket();
        socket.setTimeout(25);
        try {
            await socket.connect(22, this.hostServerInfo.ipAdress);
            await socket.end();
            return true;
        } catch (err) {
            return false;
        }
    }

    async stopIfNeeded(hostIsOnline: boolean | null, timeout: number): Promise<StatusInfo> {
        if (!await this.isOnline(hostIsOnline)) return await this.statusInfo(hostIsOnline, timeout);

        let isInactive = true;
        for (const child of this.children) {
            const childInfo = await child.stopIfNeeded(hostIsOnline, timeout);
            if (childInfo.isOnline) isInactive = false;
        }
        const info = await this.statusInfo(hostIsOnline, timeout);
        if (isInactive) {
            await this.stop();
            return {
                ...info,
                isOnline: false
            }
        }
        return info;
    }

    appendChild(child: GameServer | HostServer) {
        this.children.push(child);
    }

    async statusInfo(hostIsOnline: boolean | null, timeout: number): Promise<StatusInfo> {
        const isOnline = await this.isOnline(hostIsOnline)

        let isInactive = true
        const childrenInfo = []
        for (const child of this.children) {
            const info = await child.statusInfo(isOnline, timeout);
            childrenInfo.push(info);
            if (!info.isInactive) isInactive = false;
        }

        return {
            isInactive,
            isOnline,
            name: this.hostServerInfo.name,
            type: "hw",
            playerCount: null,
            maxPlayers: null,
            rcon: null,
            childrenInfo
        }
    }

    async stop() {
        if (!this.sshClient.isConnected()) {
            await this.sshClient.connect(this.getSSHOptions());
        }
        console.log(await this.sshClient.execCommand("sudo systemctl poweroff"));
        this.sshClient.dispose();
    }

    async shutdownGameserver({ internalName }: GameServerInfo) {
        if (!this.dockerClient) throw new Error("docker is not installed");
        for (const containerInfo of await this.dockerClient.listContainers({ all: true })) {
            if (containerInfo.Names[0] === `/${internalName}`) {
                const container = this.dockerClient.getContainer(containerInfo.Id);
                return container.stop()
            }
        }
        throw new Error("Container not found");
    }

    async checkGameServerStatus({ internalName }: GameServerInfo) {
        if (!this.dockerClient) throw new Error("docker is not installed");
        for (const containerInfo of await this.dockerClient.listContainers({ all: true })) {
            if (containerInfo.Names[0] === `/${internalName}`) {
                return containerInfo.State === "running";
            }
        }
        throw new Error("Container not found");
    }

    getIpAdress() {
        return this.hostServerInfo.ipAdress;
    }

    getSSHOptions() {
        return {
            host: this.hostServerInfo.ipAdress,
            username: this.hostServerInfo.username,
            password: this.hostServerInfo.password
        }
    }
}

export class GameServer {
    inactiveTime = -1;
    protected sshClient: SSHClient

    constructor(
        public gameServerInfo: GameServerInfo,
        public hostServer: HostServer
    ) {
        this.sshClient = new SSHClient(hostServer.getSSHOptions(), { port: this.gameServerInfo.gamePort })
    }

    protected checkInactivity(playerCount: number, timeout: number) {
        if (playerCount !== 0) {
            this.inactiveTime = -1;
            return false;
        }

        if (this.inactiveTime === -1) {
            this.inactiveTime = Date.now();
            return false;
        }

        if ((Date.now() - this.inactiveTime) < timeout * 60 * 1000) {
            return false;
        }

        return true;
    }

    async isOnline(hostIsOnline: boolean | null) {
        if (hostIsOnline === false) return false;
        if (hostIsOnline == null) {
            if (!await this.hostServer.isOnline(null)) return false;
        }
        return this.hostServer.checkGameServerStatus(this.gameServerInfo);
    }

    async statusInfo(hostIsOnline: boolean | null, timeout: number): Promise<StatusInfo> {
        let isOnline = await this.isOnline(hostIsOnline);

        let playerCount = 0

        if (isOnline) {
            if (!this.sshClient.isConnected()) {
                try {
                    await this.sshClient.connect();
                } catch (err) {
                    isOnline = false;
                }
            }
        }

        let isInactive
        if (isOnline) {
            playerCount = await this.sshClient.getPlayerCount();
            isInactive = this.checkInactivity(playerCount, timeout);
        } else {
            this.inactiveTime = -1;
            isInactive = false;
        }

        return {
            isInactive,
            isOnline,
            name: this.gameServerInfo.name,
            type: "gs",
            playerCount,
            maxPlayers: null,
            rcon: false,
            childrenInfo: null
        }
    }

    async stopIfNeeded(hostIsOnline: boolean | null, timeout: number): Promise<StatusInfo> {
        const info = await this.statusInfo(hostIsOnline, timeout);
        if (!info.isOnline) return info;
        if (info.isInactive) {
            await this.stop();
            return {
                ...info,
                isOnline: false
            }
        }
        return info;
    }

    stop() {
        if (this.sshClient.isConnected()) this.sshClient.disconnect();
        return this.hostServer.shutdownGameserver(this.gameServerInfo);
    }
}

const playerCountCommands: Record<string, { command: string, outputConverter: (data: string) => number }> = {
    mc: {
        command: "list",
        outputConverter: (data) => {
            const value = data.match(/\d/)?.[0]
            if (!value) throw new Error("outputValue not defined")
            return parseInt(value)
        }
    },
    ttt: {
        command: "ttt_print_playercount",
        outputConverter: (data) => {
            console.log(data)
            return 0
        },
    },
    tf2: {
        command: "users",
        outputConverter: (data) => {
            const value = data.split("\n").at(-2)
            if (!value) throw new Error("outputValue not defined")
            return parseInt(value)
        }
    },
    conan: {
        command: "listplayers",
        outputConverter: (data) => {
            const value = data.match(/\n/)?.length
            return value ? value - 1 : 0
        }
    },
}

export class RconGameServer extends GameServer {
    private rconClient: OldRconClient

    constructor(options: RconGameServerInfo, hostServer: HostServer) {
        super(options, hostServer)
        this.rconClient = new OldRconClient({
            host: hostServer.getIpAdress(),
            port: options.rconPort,
            password: options.rconPassword
        });
    }

    override async stop() {
        await this.rconClient.disconnect();
        return this.hostServer.shutdownGameserver(this.gameServerInfo);
    }

    override async statusInfo(hostIsOnline: boolean | null, timeout: number): Promise<StatusInfo> {
        let isOnline = await this.isOnline(hostIsOnline);

        let playerCount = 0;
        let isInactive;

        if (isOnline) {
            if (!this.rconClient.isConnected()) {
                try {
                    await this.rconClient.connect();
                } catch (err) {
                    isOnline = false;
                }
            }
        }


        if (isOnline) {
            const commands = playerCountCommands[this.gameServerInfo.gsType];
            if (!commands) throw new Error("GameServer Type not implemented yet!");
            const response = await this.rconClient.sendCommand(commands.command);
            playerCount = commands.outputConverter(response);
            if (Number.isNaN(playerCount)) throw new Error("Playercount is NaN!");
            isInactive = this.checkInactivity(playerCount, timeout);
        } else {
            this.inactiveTime = -1;
            isInactive = false;
        }

        return {
            isInactive,
            isOnline,
            name: this.gameServerInfo.name,
            type: "gs",
            playerCount,
            maxPlayers: null,
            rcon: true,
            childrenInfo: null
        }
    }

    async sendCommand(command: string) {
        if (!await this.isOnline(null)) throw new Error("host is not online!");
        if (!this.rconClient.isConnected()) await this.rconClient.connect();
        return this.rconClient.sendCommand(command);
    }
}
