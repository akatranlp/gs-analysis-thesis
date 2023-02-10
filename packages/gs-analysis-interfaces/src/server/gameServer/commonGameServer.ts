import { z } from "zod";
import { GameServer, gameServerInfoValidator } from "./gameServer";
import { HardwareHostServer } from "../hostServer/hardwareHostServer";
import { VMServer } from "../vmServer";
import { SSHClient } from "ssh-playercount";
import { StatusInfo } from "../interfaces";

export const commonGameServerInfoValidator = gameServerInfoValidator
    .omit({ checkType: true })
    .extend({
        checkType: z.literal("common"),
        gamePort: z.number().min(0).max(65535),
        protocol: z.enum(["tcp", "udp"]),
    });

export type CommonGameServerInfo = z.infer<typeof commonGameServerInfoValidator>

export const isCommonGameServer = (server: GameServer): server is CommonGameServer => {
    return server.info.checkType === "common";
}

export class CommonGameServer extends GameServer {
    private sshClient: SSHClient

    constructor(info: CommonGameServerInfo, hostServer: HardwareHostServer | VMServer) {
        super(info, hostServer);
        this.sshClient = new SSHClient(hostServer.getSSHOptions(), { port: info.gamePort })
    }

    override async stop(hostIsOnline: boolean | null) {
        this.sshClient.disconnect();
        return super.stop(hostIsOnline);
    }

    override async statusInfo(hostIsOnline: boolean | null, timeout: number): Promise<StatusInfo> {
        let isOnline = await this.isOnline(hostIsOnline);
        let playerCount = 0
        let isInactive
        if (isOnline) {
            playerCount = await this.getCommonPlayerCount();
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
            rcon: false,
            childrenInfo: null,
            shutdownedServers: [],
        }
    }

    async getCommonPlayerCount(): Promise<number> {
        if (!this.sshClient.isConnected()) {
            try {
                await this.sshClient.connect();
            } catch (err) {
                return 0;
            }
        }
        return this.sshClient.getPlayerCount();
    }
}