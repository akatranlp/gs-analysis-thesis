import { z } from "zod";
import { StatusInfo } from "../interfaces";
import { Server, serverInfoValidator } from "../interfaces";
import { HardwareHostServer } from "../hostServer/hardwareHostServer";
import { VMServer } from "../vmServer/index";

export const gameServerInfoValidator = serverInfoValidator
    .omit({ type: true })
    .extend({
        type: z.literal("gs"),
        gsType: z.string(),
        hostServer: z.string(),
        internalName: z.string(),
        checkType: z.enum(["rcon", "common"]),
    });

export type GameServerInfo = z.infer<typeof gameServerInfoValidator>
export const isGameServer = (server: Server): server is GameServer => {
    return server.info.type === "gs";
}

export class GameServer implements Server {
    protected inactiveTime = -1;
    constructor(public info: GameServerInfo, public hostServer: HardwareHostServer | VMServer) { }

    async isOnline(hostIsOnline: boolean | null): Promise<boolean> {
        return this.hostServer.checkGameServerStatus(hostIsOnline, this.info.internalName);
    }

    async stop(hostIsOnline: boolean | null): Promise<boolean> {
        if (!await this.isOnline(hostIsOnline)) return true;
        return this.hostServer.shutdownGameserver(hostIsOnline, this.info.internalName);
    }

    async stopIfNeeded(hostIsOnline: boolean | null, timeout: number): Promise<StatusInfo> {
        const info = await this.statusInfo(hostIsOnline, timeout);
        if (!info.isOnline || !info.isInactive) return info;
        const success = await this.stop(true);
        if (!success) return info;
        return {
            ...info,
            isInactive: false,
            isOnline: false,
            shutdownedServers: [this.info.name]
        }
    }

    async start(hostIsOnline: boolean | null): Promise<boolean> {
        if (hostIsOnline == null) {
            hostIsOnline = await this.hostServer.isOnline(null);
        }
        if (hostIsOnline === false) {
            const success = await this.hostServer.start();
            if (!success) return false;
        }
        return this.hostServer.startGameServer(true, this.info.internalName);
    }

    async statusInfo(hostIsOnline: boolean | null, timeout: number): Promise<StatusInfo> {
        throw new Error("not implemented!")
    }

    protected checkInactivity(playerCount: number, timeout: number): boolean {
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

}