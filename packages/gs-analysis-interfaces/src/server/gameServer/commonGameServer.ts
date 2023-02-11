import { z } from "zod";
import { GameServer, gameServerInfoValidator } from "./gameServer";
import { SSHClient } from "ssh-playercount";
import { ServerStatus, StatusInfo } from "gs-analysis-types";
import { DockerHost } from "../dockerhost";

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

    constructor(info: CommonGameServerInfo, hostServer: DockerHost) {
        super(info, hostServer);
        this.sshClient = new SSHClient(hostServer.getSSHOptions(), { port: info.gamePort })
    }

    override async stop(hostStatus: ServerStatus | null) {
        this.sshClient.disconnect();
        return super.stop(hostStatus);
    }

    override async statusInfo(hostStatus: ServerStatus | null, timeout: number): Promise<StatusInfo> {
        const status = await this.getServerStatus(hostStatus);

        let playerCount = 0
        let isInactive
        if (status === "running") {
            playerCount = await this.getCommonPlayerCount();
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