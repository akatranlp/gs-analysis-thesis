import { z } from "zod";
import { ServerStatus, StatusInfo } from "gs-analysis-types";
import { Server, serverInfoValidator } from "../interfaces";
import { DockerHost } from "../dockerhost";
import { delay } from "utils";

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
    givenServerStatus: "starting" | "stopping" | null = null;
    protected inactiveTime = -1;
    constructor(public info: GameServerInfo, public hostServer: DockerHost) { }

    async getServerStatus(hostStatus: ServerStatus | null): Promise<ServerStatus> {
        if (this.givenServerStatus) return this.givenServerStatus;
        return this.hostServer.checkGameServerStatus(hostStatus, this.info.internalName);
    }

    async stop(hostStatus: ServerStatus | null): Promise<boolean> {
        const status = await this.getServerStatus(hostStatus);
        if (status === "stopped" || status === "stopping") return true;
        //// wait when starting
        this.givenServerStatus = "stopping";
        const success = await this.hostServer.shutdownGameserver(hostStatus, this.info.internalName);
        this.givenServerStatus = null;
        return success;
    }

    async stopIfNeeded(hostStatus: ServerStatus | null, timeout: number): Promise<StatusInfo> {
        const info = await this.statusInfo(hostStatus, timeout);
        if (info.status !== "running") return info;
        if (!info.isInactive) return info;

        const success = await this.stop("running");
        if (!success) return info;
        return {
            ...info,
            isInactive: false,
            status: "stopped",
            shutdownedServers: [this.info.name]
        }
    }

    async start(): Promise<boolean> {
        const status = await this.getServerStatus(null);
        if (status === "running" || status === "starting") return true;
        //// wait when stopping
        this.givenServerStatus = "starting";
        const success = await this.hostServer.startGameServer(this.info.internalName);
        await delay(10_000);
        this.givenServerStatus = null;
        return success;
    }

    async statusInfo(hostStatus: ServerStatus | null, timeout: number): Promise<StatusInfo> {
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