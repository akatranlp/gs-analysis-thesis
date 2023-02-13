import { ServerStatus, StatusInfo } from "gs-analysis-types";
import { z } from "zod";
import { GameServer, gameServerInfoValidator } from "./gameServer";
import { OldRconClient } from "rcon";
import rconCommandsMap from "../../rconCommandsMap";
import { DockerHost } from "../dockerhost";

import { createLogger } from "logger";

const rconLog = createLogger("RCON-GS");

export const rconGameServerInfoValidator = gameServerInfoValidator
    .omit({ checkType: true })
    .extend({
        checkType: z.literal("rcon"),
        rconPort: z.number().min(0).max(65535),
        rconPassword: z.string(),
    });

export type RconGameServerInfo = z.infer<typeof rconGameServerInfoValidator>

export const isRconGameServer = (server: GameServer): server is RconGameServer => {
    return server.info.checkType === "rcon";
}

export class RconGameServer extends GameServer {
    rconClient: OldRconClient

    constructor(info: RconGameServerInfo, hostServer: DockerHost) {
        super(info, hostServer);
        this.rconClient = new OldRconClient({
            host: hostServer.info.ipAdress,
            port: info.rconPort,
            password: info.rconPassword
        });
    }

    override async stop(hostStatus: ServerStatus | null) {
        await this.rconClient.disconnect();
        return super.stop(hostStatus);
    }

    override async statusInfo(hostStatus: ServerStatus | null, timeout: number): Promise<StatusInfo> {
        const status = await this.getServerStatus(hostStatus);

        let playerCount = 0
        let isInactive
        if (status === "running") {
            playerCount = await this.getRconPlayerCount();
            isInactive = this.checkInactivity(playerCount, timeout);
        } else {
            this.inactiveTime = -1;
            isInactive = false;
        }

        return {
            isInactive,
            status,
            name: this.info.name,
            type: this.info.type,
            playerCount,
            maxPlayers: null,
            rcon: true,
            childrenInfo: null,
            shutdownedServers: [],
        }
    }

    async sendCommand(command: string): Promise<string> {
        const status = await this.getServerStatus(null);
        if (status !== "running") return "Server is not online at the moment!";
        if (!this.rconClient.isConnected()) await this.rconClient.connect();
        return this.rconClient.sendCommand(command);
    }

    async getRconPlayerCount(): Promise<number> {
        if (!this.rconClient.isConnected()) {
            try {
                await this.rconClient.connect();
            } catch (err) {
                return 0;
            }
        }
        const commands = rconCommandsMap[this.info.gsType];
        if (!commands) throw new Error("GameServer Type not implemented yet!");
        const response = await this.rconClient.sendCommand(commands.command);

        const playerCount = commands.outputConverter(response);
        if (Number.isNaN(playerCount)) throw new Error("Playercount is NaN!");

        rconLog(this.info.name, playerCount);

        return playerCount;
    }
}
