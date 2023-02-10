import { StatusInfo } from "../interfaces";
import { z } from "zod";
import { GameServer, gameServerInfoValidator } from "./gameServer";
import { HardwareHostServer } from "../hostServer/hardwareHostServer";
import { VMServer } from "../vmServer";
import { OldRconClient } from "rcon";
import rconCommandsMap from "../../rconCommandsMap";

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
    private rconClient: OldRconClient

    constructor(info: RconGameServerInfo, hostServer: HardwareHostServer | VMServer) {
        super(info, hostServer);
        this.rconClient = new OldRconClient({
            host: hostServer.info.ipAdress,
            port: info.rconPort,
            password: info.rconPassword
        });
    }

    override async stop(hostIsOnline: boolean | null) {
        await this.rconClient.disconnect();
        return super.stop(hostIsOnline);
    }

    override async statusInfo(hostIsOnline: boolean | null, timeout: number): Promise<StatusInfo> {
        let isOnline = await this.isOnline(hostIsOnline);

        let playerCount = 0
        let isInactive
        if (isOnline) {
            playerCount = await this.getRconPlayerCount();
            isInactive = this.checkInactivity(playerCount, timeout);
        } else {
            this.inactiveTime = -1;
            isInactive = false;
        }

        return {
            isInactive,
            isOnline,
            name: this.info.name,
            type: this.info.type,
            playerCount: 0,
            maxPlayers: null,
            rcon: true,
            childrenInfo: null,
            shutdownedServers: [],
        }
    }

    async sendCommand(command: string): Promise<string> {
        if (!await this.isOnline(null)) throw new Error("host is not online!");
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
        return playerCount;
    }

}
