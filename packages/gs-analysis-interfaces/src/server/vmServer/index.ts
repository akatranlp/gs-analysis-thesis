import { z } from "zod";
import { createDockerAgent, serverInfoValidator, StatusInfo } from "../interfaces";
import { HostServer } from "../hostServer/hostServer";
import { Server } from "../interfaces";
import PromiseSocket from "promise-socket";
import Docker, { DockerOptions } from "dockerode";
import { GameServer } from "../gameServer/gameServer";
import { isProxmoxHostServer } from "../hostServer/proxmoxHostServer";
import { delay } from "utils";


export const vmServerInfoValidator = serverInfoValidator
    .omit({ type: true })
    .extend({
        type: z.literal("vm"),
        ipAdress: z.string().regex(/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/),
        username: z.string(),
        password: z.string(),
        hostServer: z.string(),
    });

export type VMServerInfo = z.infer<typeof vmServerInfoValidator>

export const isVMServer = (server: Server): server is VMServer => {
    return server.info.type === "vm";
}

export class VMServer {
    private children: GameServer[] = [];
    private dockerClient;

    constructor(public info: VMServerInfo, public hostServer: HostServer) {
        const agent = createDockerAgent(this.getSSHOptions())
        this.dockerClient = new Docker({
            //agent
            protocol: "ssh",
            username: info.username,
            host: info.ipAdress,
            password: info.password,
            sshOptions: {
                timeout: 200
            }
        } as DockerOptions)
    }

    addChild(child: GameServer) {
        this.children.push(child);
    }

    async isOnline(hostIsOnline: boolean | null): Promise<boolean> {
        if (hostIsOnline === null) {
            hostIsOnline = await this.hostServer.isOnline();
        }
        if (hostIsOnline === false) return false;

        try {
            console.log("Before connecting VM!", this.info.name);
            const socket = new PromiseSocket();
            socket.setTimeout(25);
            await socket.connect(22, this.info.ipAdress);
            await socket.end();
            console.log("After connecting VM!", this.info.name);
            return true;
        } catch (err) {
            return false;
        }
    }

    async stop(): Promise<boolean> {
        if (!await this.isOnline(null)) return true;

        for (const child of this.children) {
            const success = await child.stop(true);
            if (!success) return false;
        }
        if (isProxmoxHostServer(this.hostServer)) {
            return this.hostServer.shutdownVM(this.info.name);
        }
        return false;
    }

    async stopIfNeeded(hostIsOnline: boolean | null, timeout: number): Promise<StatusInfo> {
        const isOnline = await this.isOnline(hostIsOnline);
        if (!isOnline) return await this.statusInfo(hostIsOnline, timeout);
        let isInactive = true;

        let shutdownedServers: string[] = []

        for (const child of this.children) {
            const info = await child.stopIfNeeded(isOnline, timeout);
            shutdownedServers = [...shutdownedServers, ...info.shutdownedServers]
            if (info.isOnline) isInactive = false;
        }

        const info = await this.statusInfo(hostIsOnline, timeout);
        if (isInactive) {
            const success = await this.stop();
            if (success) {
                shutdownedServers.push(this.info.name);
                return {
                    ...info,
                    isOnline: false,
                    isInactive: false,
                    shutdownedServers,
                }
            };
        }

        return {
            ...info,
            shutdownedServers,
        }
    }

    async start(): Promise<boolean> {
        let hostIsOnline = await this.hostServer.isOnline();
        if (await this.isOnline(hostIsOnline)) return true;
        if (!hostIsOnline) {
            await this.hostServer.start();
        }
        if (isProxmoxHostServer(this.hostServer)) {
            const success = this.hostServer.startVM(this.info.name);
            if (!success) return false;
            await delay(30_000);
            if (await this.isOnline(true))
                return true
            return false;
        }
        return false;
    }

    async statusInfo(hostIsOnline: boolean | null, timeout: number): Promise<StatusInfo> {
        const isOnline = await this.isOnline(hostIsOnline);
        let isInactive = true;
        const childrenInfo: StatusInfo[] = []
        for (const child of this.children) {
            const info = await child.statusInfo(isOnline, timeout);
            childrenInfo.push(info);
            if (info.isOnline && !info.isInactive) isInactive = false;
        }

        return {
            isInactive,
            isOnline,
            name: this.info.name,
            type: this.info.type,
            playerCount: null,
            maxPlayers: null,
            rcon: null,
            childrenInfo,
            shutdownedServers: [],
        }
    }

    getSSHOptions() {
        return {
            host: this.info.ipAdress,
            port: 22,
            username: this.info.username,
            password: this.info.password,
            timeout: 1000,
        }
    }

    async startGameServer(thisIsOnline: boolean | null, internalName: string): Promise<boolean> {
        if (thisIsOnline === null) {
            thisIsOnline = await this.isOnline(null);
        }
        if (thisIsOnline === false) return false;

        for (const containerInfo of await this.dockerClient.listContainers({ all: true })) {
            if (containerInfo.Names[0] === `/${internalName}`) {
                const container = this.dockerClient.getContainer(containerInfo.Id);
                await container.start();
                return true;
            }
        }
        throw new Error("Container not found");
    }

    async shutdownGameserver(thisIsOnline: boolean | null, internalName: string): Promise<boolean> {
        if (thisIsOnline === null) {
            thisIsOnline = await this.isOnline(null);
        }
        if (thisIsOnline === false) return true;

        for (const containerInfo of await this.dockerClient.listContainers({ all: true })) {
            if (containerInfo.Names[0] === `/${internalName}`) {
                const container = this.dockerClient.getContainer(containerInfo.Id);
                await container.stop();
                return true;
            }
        }
        throw new Error("Container not found");
    }

    async checkGameServerStatus(thisIsOnline: boolean | null, internalName: string): Promise<boolean> {
        if (thisIsOnline === null) {
            thisIsOnline = await this.isOnline(null);
        }
        if (thisIsOnline === false) return false;
        const response = await this.dockerClient.listContainers({ all: true });
        try {
            for (const containerInfo of response) {
                if (containerInfo.Names[0] === `/${internalName}`) {
                    return containerInfo.State === "running";
                }
            }
        } catch (err) {
            return false;
        }
        throw new Error("Container not found");
    }
}
