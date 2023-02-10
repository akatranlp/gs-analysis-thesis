import DgramAsPromised from "dgram-as-promised";
import PromiseSocket from "promise-socket";
import { delay } from "utils";
import { z } from "zod";
import { GameServer } from "../gameServer/gameServer";
import { Server, serverInfoValidator, StatusInfo } from "../interfaces";
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
    private children: (GameServer | VMServer)[] = [];

    constructor(public info: HostServerInfo) { }

    addChild(child: GameServer | VMServer) {
        this.children.push(child);
    }

    async isOnline(): Promise<boolean> {
        try {
            console.log("Before connecting!", this.info.name);
            const socket = new PromiseSocket();
            socket.setTimeout(25);
            await socket.connect(22, this.info.ipAdress);
            await socket.end();
            console.log("After connecting!", this.info.name);
            return true;
        } catch (err) {
            return false;
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
        if (await this.isOnline()) return true;
        await this.sendMagicPacket();

        await delay(60_000);
        if (await this.isOnline())
            return true
        return false;
    }

    async stop(): Promise<boolean> {
        if (!await this.isOnline()) return true;
        for (const child of this.children) {
            const success = await child.stop(true);
            if (!success) return false;
        }
        return true;
    }

    async stopIfNeeded(timeout: number): Promise<StatusInfo> {
        const isOnline = await this.isOnline();
        if (!isOnline) return await this.statusInfo(timeout);
        let isInactive = true;

        let shutdownedServers: string[] = []

        for (const child of this.children) {
            const info = await child.stopIfNeeded(isOnline, timeout);
            shutdownedServers = [...shutdownedServers, ...info.shutdownedServers]
            if (info.isOnline) isInactive = false;
        }

        const info = await this.statusInfo(timeout);
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

    async statusInfo(timeout: number): Promise<StatusInfo> {
        const isOnline = await this.isOnline();
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
}
