import DgramAsPromised from "dgram-as-promised";
import PromiseSocket from "promise-socket";
import { delay } from "utils";
import { z } from "zod";
import { GameServer } from "../gameServer/gameServer";
import { Server, serverInfoValidator } from "../interfaces";
import { ServerStatus, StatusInfo } from "gs-analysis-types";
import { VMServer } from "../vmServer/index";


export const hostServerInfoValidator = serverInfoValidator
    .omit({ type: true })
    .extend({
        type: z.literal("hw"),
        ipAdress: z.string().regex(/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/),
        mac: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/),
        username: z.string(),
        password: z.string(),
        hostType: z.enum(["proxmox", "none"]),
    });


export type HostServerInfo = z.infer<typeof hostServerInfoValidator>

export const isHostServer = (server: Server): server is HostServer => {
    return server.info.type === "hw";
}

export class HostServer implements Server {
    givenServerStatus: "starting" | "stopping" | null = null;
    private children: (GameServer | VMServer)[] = [];

    constructor(public info: HostServerInfo) { }

    addChild(child: GameServer | VMServer) {
        this.children.push(child);
    }

    async getServerStatus(): Promise<ServerStatus> {
        if (this.givenServerStatus) return this.givenServerStatus;
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

    private async sendMagicPacket() {
        const { mac, ipAdress } = this.info
        const packet = Buffer.from("ff".repeat(6) + mac.replaceAll(mac[2], "").repeat(16), "hex");
        const socket = DgramAsPromised.createSocket("udp4");
        const broadcast = `${ipAdress.substring(0, ipAdress.lastIndexOf("."))}.255`;

        await socket.bind();
        socket.setBroadcast(true);
        for (let i = 3; i > 0; i--) {
            await socket.send(packet, 9, broadcast);
        }
        await socket.close();
    }

    async start(): Promise<boolean> {
        const status = await this.getServerStatus();
        if (status === "running" || status === "starting") return true;
        /// wait stopping

        this.givenServerStatus = "starting";
        await this.sendMagicPacket();

        await delay(60_000);
        this.givenServerStatus = null;
        return await this.getServerStatus() === "running"
    }

    async stop(): Promise<boolean> {
        const status = await this.getServerStatus();
        if (status === "stopped" || status === "stopping") return true;
        /// wait starting

        this.givenServerStatus = "stopping";
        for (const child of this.children) {
            const success = await child.stop("running");
            if (!success) return false;
        }
        return true;
    }

    async stopIfNeeded(timeout: number): Promise<StatusInfo> {
        const status = await this.getServerStatus();
        if (status !== "running") return this.statusInfo(timeout);

        let isInactive = true;
        let shutdownedServers: string[] = []

        const childrenInfo: StatusInfo[] = []
        for (const child of this.children) {
            const info = await child.stopIfNeeded(status, timeout);
            shutdownedServers = [...shutdownedServers, ...info.shutdownedServers];
            childrenInfo.push({ ...info, shutdownedServers: [] });
            if (info.status === "starting" || (info.status === "running" && !info.isInactive)) isInactive = false;
        }

        if (isInactive) {
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

    async statusInfo(timeout: number): Promise<StatusInfo> {
        const status = await this.getServerStatus();

        let isInactive = true;
        const childrenInfo: StatusInfo[] = []
        for (const child of this.children) {
            const info = await child.statusInfo(status, timeout);
            childrenInfo.push(info);
            if (info.status === "running" && !info.isInactive) isInactive = false;
        }

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
