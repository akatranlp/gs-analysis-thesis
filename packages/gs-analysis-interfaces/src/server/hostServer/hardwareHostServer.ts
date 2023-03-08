import { z } from "zod";
import { HostServer, hostServerInfoValidator } from "./hostServer";
import { NodeSSH } from "node-ssh";
import { DockerHost } from "../dockerhost";
import { delay } from "utils";

export const hardwareHostServerInfoValidator = hostServerInfoValidator
    .omit({ hostType: true })
    .extend({
        hostType: z.literal("none"),
    });

export type HardwareHostServerInfo = z.infer<typeof hardwareHostServerInfoValidator>

export const isHardwareHostServer = (server: HostServer): server is HardwareHostServer => {
    return server.info.hostType === "none";
}

export class HardwareHostServer extends HostServer {
    dockerHost: DockerHost;
    private sshClient = new NodeSSH();

    constructor(info: HardwareHostServerInfo) {
        super(info);
        this.dockerHost = new DockerHost(info, this);
    }

    override async stop(): Promise<boolean> {
        const success = super.stop();
        if (!success) return false;
        this.givenServerStatus = "stopping";

        if (!this.sshClient.isConnected()) {
            await this.sshClient.connect({
                host: this.info.ipAdress,
                port: 22,
                username: this.info.username,
                password: this.info.password,
                timeout: 1000,
            });
        }
        await this.sshClient.execCommand("(sleep 10; sudo shutdown -h now) &");
        this.sshClient.dispose();
        await delay(12_000);
        this.givenServerStatus = null;
        this.startedTime = undefined;
        return true;
    }
}
