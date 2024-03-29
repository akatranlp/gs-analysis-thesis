import { z } from "zod";
import { serverInfoValidator } from "../interfaces";
import { HostServer } from "../hostServer/hostServer";
import { Server } from "../interfaces";
import PromiseSocket from "promise-socket";
import { GameServer } from "../gameServer/gameServer";
import { isProxmoxHostServer } from "../hostServer/proxmoxHostServer";
import { StatusInfo, ServerStatus } from "gs-analysis-types";
import { delay } from "utils";
import { DockerHost } from "../dockerhost";
import { createLogger } from "logger";

const log = createLogger("VM-Server");

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

export class VMServer implements Server {
    dockerHost: DockerHost;
    givenServerStatus: "starting" | "stopping" | null = null;
    private startedTime?: Date
    private children: GameServer[] = [];

    constructor(public info: VMServerInfo, public hostServer: HostServer) {
        this.dockerHost = new DockerHost(info, this);
    }

    addChild(child: GameServer) {
        this.children.push(child);
    }

    async getServerStatus(hostStatus: ServerStatus | null): Promise<ServerStatus> {
        if (this.givenServerStatus) return this.givenServerStatus;
        if (hostStatus == null) {
            hostStatus = await this.hostServer.getServerStatus();
        }
        if (hostStatus != "running") return "stopped";
        try {
            const socket = new PromiseSocket();
            socket.setTimeout(25);
            await socket.connect(22, this.info.ipAdress);
            await socket.end();
            return "running";
        } catch (err) {
            return "stopped";
        }
    }

    async stop(): Promise<boolean> {
        const status = await this.getServerStatus(null);
        if (status === "stopped" || status === "stopping") return true;
        /// wait if starting

        this.givenServerStatus = "stopping";
        for (const child of this.children) {
            const success = await child.stop("running");
            if (!success) return false;
        }
        if (isProxmoxHostServer(this.hostServer)) {
            const success = this.hostServer.shutdownVM(this.info.name);
            this.givenServerStatus = null;
            this.startedTime = undefined;
            return success;
        }
        return false;
    }

    async stopIfNeeded(hostStatus: ServerStatus | null, timeout: number): Promise<StatusInfo> {
        const status = await this.getServerStatus(hostStatus);
        if (status !== "running") return this.statusInfo(hostStatus, timeout);

        let isInactive = this.startedTime ? (new Date().getTime() - this.startedTime.getTime()) > 1000 * 60 * timeout : true;
        let shutdownedServers: string[] = []
        const childrenInfo = (await Promise.all(this.children.map(child => child.stopIfNeeded(status, timeout))))
            .map(info => {
                if (info.status === "starting" || (info.status === "running" && !info.isInactive)) isInactive = false;
                shutdownedServers = [...shutdownedServers, ...info.shutdownedServers];
                return {
                    ...info,
                    shutdownedServers: []
                }
            });

        if (isInactive && this.info.shutdownIdNeeded) {
            const success = await this.stop();
            if (success) {
                shutdownedServers.push(this.info.name)
                return {
                    status: "stopped",
                    isInactive: false,
                    name: this.info.name,
                    type: this.info.type,
                    playerCount: null,
                    maxPlayers: null,
                    rcon: null,
                    childrenInfo,
                    shutdownedServers,
                }
            }
        }

        return {
            status: "running",
            isInactive,
            name: this.info.name,
            type: this.info.type,
            playerCount: null,
            maxPlayers: null,
            rcon: null,
            childrenInfo,
            shutdownedServers,
        }
    }

    async start(): Promise<boolean> {
        const hostStatus = await this.hostServer.getServerStatus();
        const status = await this.getServerStatus(hostStatus);
        if (status === "running" || status === "starting") return true;
        /// wait stopping
        this.givenServerStatus = "starting";
        if (hostStatus !== "running") {
            await this.hostServer.start();
        }
        if (isProxmoxHostServer(this.hostServer)) {
            const success = this.hostServer.startVM(this.info.name);
            if (!success) return false;
            await delay(30_000);
            this.givenServerStatus = null;
            this.startedTime = new Date();
            return await this.getServerStatus("running") === "running"
        }
        return false;
    }

    async statusInfo(hostStatus: ServerStatus | null, timeout: number): Promise<StatusInfo> {
        const status = await this.getServerStatus(hostStatus);

        const childrenInfo = await Promise.all(this.children.map(child => child.statusInfo(status, timeout)));

        let isInactive = true;
        childrenInfo.forEach(info => {
            if (info.status === "starting" || (info.status === "running" && !info.isInactive)) isInactive = false;
        });

        return {
            isInactive: status !== "running" ? false : isInactive,
            status,
            name: this.info.name,
            type: this.info.type,
            playerCount: null,
            maxPlayers: null,
            rcon: null,
            childrenInfo,
            shutdownedServers: [],
        }
    }
}
