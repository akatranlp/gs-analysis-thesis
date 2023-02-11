import Docker, { DockerOptions } from "dockerode";
import { ServerStatus } from "gs-analysis-types";
import { HardwareHostServer, HardwareHostServerInfo } from "./hostServer/hardwareHostServer";
import { VMServer, VMServerInfo } from "./vmServer/index";

type DockerHostInfo = VMServerInfo | HardwareHostServerInfo

export class DockerHost {
    private dockerClient
    constructor(public info: DockerHostInfo, public host: HardwareHostServer | VMServer) {
        this.dockerClient = new Docker({
            protocol: "ssh",
            username: info.username,
            host: info.ipAdress,
            password: info.password,
            sshOptions: {
                timeout: 200
            }
        } as DockerOptions)
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

    async startGameServer(internalName: string): Promise<boolean> {
        const hostStatus = await this.host.getServerStatus(null);
        if (hostStatus === "stopping") {
            /// wait
        }
        if (hostStatus === "stopped") {
            await this.host.start();
        }

        for (const containerInfo of await this.dockerClient.listContainers({ all: true })) {
            if (containerInfo.Names[0] === `/${internalName}`) {
                const container = this.dockerClient.getContainer(containerInfo.Id);
                await container.start();
                return true;
            }
        }
        throw new Error("Container not found");
    }

    async shutdownGameserver(hostStatus: ServerStatus | null, internalName: string): Promise<boolean> {
        if (hostStatus == null) {
            hostStatus = await this.host.getServerStatus(null);
        }
        if (hostStatus !== "running") return true;

        for (const containerInfo of await this.dockerClient.listContainers({ all: true })) {
            if (containerInfo.Names[0] === `/${internalName}`) {
                const container = this.dockerClient.getContainer(containerInfo.Id);
                await container.stop();
                return true;
            }
        }
        throw new Error("Container not found");
    }

    async checkGameServerStatus(hostStatus: ServerStatus | null, internalName: string): Promise<ServerStatus> {
        if (hostStatus == null) {
            hostStatus = await this.host.getServerStatus(hostStatus);
        }
        if (hostStatus !== "running") return "stopped";
        const response = await this.dockerClient.listContainers({ all: true });
        try {
            for (const containerInfo of response) {
                if (containerInfo.Names[0] === `/${internalName}`) {
                    return containerInfo.State === "running" ? "running" : "stopped";
                }
            }
        } catch (err) {
            return "stopped";
        }
        throw new Error("Container not found");
    }
}