import { HostServerInfo, GameServerInfo, RconGameServerInfo } from "./serverInfo";
import rconCommandsMap from "./rconCommandsMap";
import { OldRconClient } from "rcon";
import { SSHClient } from "ssh-playercount";
import { NodeSSH } from "node-ssh";
import Docker, { DockerOptions } from "dockerode";
import { PromiseSocket } from "promise-socket";
import { DgramAsPromised } from "dgram-as-promised";
import axios, { AxiosInstance } from "axios";
import { delay } from "utils";

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

interface PMResponse<T> {
    data: T
}

const sendMagicPacket = async ({ mac, ipAdress }: HostServerInfo) => {
    if (!mac) throw new Error("no mac provided!");
    const packet = Buffer.from('ff'.repeat(6) + mac.replaceAll(mac[2], '').repeat(16), 'hex');
    const broadcast = `${ipAdress.substring(0, ipAdress.lastIndexOf("."))}.255`;
    const socket = DgramAsPromised.createSocket("udp4");
    await socket.bind();
    socket.setBroadcast(true);
    for (let i = 3; i > 0; i--) {
        await socket.send(packet, 9, broadcast);
    }
    await socket.close();
}

export class HostServer {
    private children: (GameServer | HostServer)[] = [];
    dockerClient: Docker | null = null;
    private sshClient = new NodeSSH();
    private axios: AxiosInstance | null = null

    constructor(
        private hostServerInfo: HostServerInfo,
        private hostServer: HostServer | null
    ) {
        if (hostServerInfo.dockerInstalled) {
            this.dockerClient = new Docker({
                protocol: "ssh",
                host: hostServerInfo.ipAdress,
                port: 22,
                timeout: 25,
                username: hostServerInfo.username,
                password: hostServerInfo.password
            } as DockerOptions)
        }
        if (hostServerInfo.hostType === "proxmox") {
            this.axios = axios.create({
                baseURL: `${hostServerInfo.pmURL}/api2/json/`,
                headers: {
                    Authorization: `PVEAPIToken=${this.hostServerInfo.pmUsername}!${this.hostServerInfo.pmTokenName}=${this.hostServerInfo.pmToken}`
                }
            })
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
            console.log("Before connecting!", this.hostServerInfo.name)
            await socket.connect(22, this.hostServerInfo.ipAdress);
            await socket.end();
            console.log("After connecting!", this.hostServerInfo.name)
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
            if (info.isOnline && !info.isInactive) isInactive = false;
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

    async shutdownVM(name: string) {
        if (this.hostServerInfo.hostType == null) throw new Error("No VM Host");
        if (!await this.isOnline(null)) return;
        if (this.hostServerInfo.hostType === "none") throw new Error("Not implemented");
        if (this.hostServerInfo.hostType !== "proxmox") throw new Error("Not implemented");

        try {
            interface VM {
                vmid: number,
                name: string,
                status: "stopped" | "running",
            }
            const response = await this.axios!.get<PMResponse<VM[]>>(`nodes/${this.hostServerInfo.name}/qemu/`);

            for (const vm of response.data.data) {
                if (vm.name === name) {
                    const response = await this.axios!.get<PMResponse<VM>>(`nodes/${this.hostServerInfo.name}/qemu/${vm.vmid}/status/current`);
                    if (response.data.data.status === "stopped") return;
                    await this.axios!.post<PMResponse<string>>(`nodes/${this.hostServerInfo.name}/qemu/${vm.vmid}/status/shutdown`);
                }
            }
        } catch (err) {
            throw err;
        }
    }

    async startVM(name: string) {
        if (this.hostServerInfo.hostType == null) throw new Error("No VM Host");
        if (!await this.isOnline(null)) return;
        if (this.hostServerInfo.hostType === "none") throw new Error("Not implemented");
        if (this.hostServerInfo.hostType !== "proxmox") throw new Error("Not implemented");

        try {
            interface VM {
                vmid: number,
                name: string,
                status: "stopped" | "running",
            }
            const response = await this.axios!.get<PMResponse<VM[]>>(`nodes/${this.hostServerInfo.name}/qemu/`);

            for (const vm of response.data.data) {
                if (vm.name === name) {
                    const response = await this.axios!.get<PMResponse<VM>>(`nodes/${this.hostServerInfo.name}/qemu/${vm.vmid}/status/current`);
                    if (response.data.data.status === "running") return;
                    await this.axios!.post<PMResponse<string>>(`nodes/${this.hostServerInfo.name}/qemu/${vm.vmid}/status/start`);
                }
            }
        } catch (err) {
            throw err;
        }
    }

    async stop() {
        if (!await this.isOnline(null)) return;
        if (this.hostServer && this.hostServer.hostServerInfo.hostType === "proxmox") {
            return this.hostServer.shutdownVM(this.hostServerInfo.name)
        }
        if (this.hostServerInfo.hostType === "proxmox") {
            try {
                return this.axios!.post<PMResponse<null>>(`nodes/${this.hostServerInfo.name}/status`, {
                    command: "shutdown"
                });
            } catch (err) {
                throw err;
            }
        }
        if (!this.sshClient.isConnected()) {
            await this.sshClient.connect(this.getSSHOptions());
        }
        await this.sshClient.execCommand("sudo systemctl poweroff");
        this.sshClient.dispose();
    }

    async start() {
        if (!this.hostServer) {
            await sendMagicPacket(this.hostServerInfo);
            await delay(30000);
            return this.isOnline(null);
        }
        if (!await this.hostServer.isOnline(null)) {
            await this.hostServer.start();
        }
        if (this.hostServer.hostServerInfo.hostType === "proxmox") {
            await this.hostServer.startVM(this.hostServerInfo.name);
            await delay(10000);
            return this.isOnline(true);
        }
        throw new Error("not implemented!");
    }

    async startGameServer(internalName: string) {
        if (!await this.isOnline(null)) return;
        if (!this.dockerClient) throw new Error("docker is not installed");
        for (const containerInfo of await this.dockerClient.listContainers({ all: true })) {
            if (containerInfo.Names[0] === `/${internalName}`) {
                const container = this.dockerClient.getContainer(containerInfo.Id);
                return container.start()
            }
        }
        throw new Error("Container not found");
    }

    async shutdownGameserver(internalName: string) {
        if (!await this.isOnline(null)) return;
        if (!this.dockerClient) throw new Error("docker is not installed");
        for (const containerInfo of await this.dockerClient.listContainers({ all: true })) {
            if (containerInfo.Names[0] === `/${internalName}`) {
                const container = this.dockerClient.getContainer(containerInfo.Id);
                return container.stop()
            }
        }
        throw new Error("Container not found");
    }

    async checkGameServerStatus(hostIsOnline: boolean | null, internalName: string) {
        if (hostIsOnline === null) {
            hostIsOnline = await this.isOnline(null);
        }
        if (hostIsOnline === false) return false;
        if (!this.dockerClient) throw new Error("docker is not installed");
        try {
            for (const containerInfo of await this.dockerClient.listContainers({ all: true })) {
                if (containerInfo.Names[0] === `/${internalName}`) {
                    return containerInfo.State === "running";
                }
            }
        } catch (err) {
            return false;
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
        if (hostIsOnline == null) {
            hostIsOnline = !await this.hostServer.isOnline(null);
        }
        if (hostIsOnline === false) return false;
        return this.hostServer.checkGameServerStatus(hostIsOnline, this.gameServerInfo.internalName);
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

    start() {
        return this.hostServer.startGameServer(this.gameServerInfo.internalName)
    }

    stop() {
        if (this.sshClient.isConnected()) this.sshClient.disconnect();
        return this.hostServer.shutdownGameserver(this.gameServerInfo.internalName);
    }
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
        return this.hostServer.shutdownGameserver(this.gameServerInfo.internalName);
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
            const commands = rconCommandsMap[this.gameServerInfo.gsType];
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
