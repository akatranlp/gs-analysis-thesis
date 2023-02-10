import { createDockerAgent } from "../interfaces";
import { z } from "zod";
import { HostServer, hostServerInfoValidator } from "./hostServer";
import Docker, { DockerOptions } from "dockerode";
import { NodeSSH } from "node-ssh";

export const hardwareHostServerInfoValidator = hostServerInfoValidator
    .omit({ hostType: true, dockerInstalled: true })
    .extend({
        hostType: z.literal("none"),
    });

export type HardwareHostServerInfo = z.infer<typeof hardwareHostServerInfoValidator>

export const isHardwareHostServer = (server: HostServer): server is HardwareHostServer => {
    return server.info.hostType === "none";
}

export class HardwareHostServer extends HostServer {
    private dockerClient
    private sshClient = new NodeSSH();

    constructor(info: HardwareHostServerInfo) {
        super(info);
        const agent = createDockerAgent(this.getSSHOptions())
        this.dockerClient = new Docker({
            // agent
            protocol: "ssh",
            username: info.username,
            host: info.ipAdress,
            password: info.password,
            sshOptions: {
                timeout: 200
            }
        } as DockerOptions)
    }

    override async stop(): Promise<boolean> {
        const success = super.stop();
        if (!success) return false;

        if (!this.sshClient.isConnected()) {
            await this.sshClient.connect(this.getSSHOptions());
        }
        await this.sshClient.execCommand("sudo systemctl poweroff");
        this.sshClient.dispose();
        return true;
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
            thisIsOnline = await this.isOnline();
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
            thisIsOnline = await this.isOnline();
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
            thisIsOnline = await this.isOnline();
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
