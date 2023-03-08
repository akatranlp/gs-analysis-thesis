import { z } from "zod";
import { HostServer, hostServerInfoValidator } from "./hostServer";
import axios from "axios";

export const proxmoxHostServerInfoValidator = hostServerInfoValidator
    .omit({ hostType: true, dockerInstalled: true })
    .extend({
        hostType: z.literal("proxmox"),
        pmURL: z.string().url(),
        pmUsername: z.string(),
        pmTokenName: z.string(),
        pmToken: z.string(),
    });

export type ProxmoxHostServerInfo = z.infer<typeof proxmoxHostServerInfoValidator>

export const isProxmoxHostServer = (server: HostServer): server is ProxmoxHostServer => {
    return server.info.hostType === "proxmox";
}

interface PMResponse<T> {
    data: T
}

export class ProxmoxHostServer extends HostServer {
    private axios

    constructor(info: ProxmoxHostServerInfo) {
        super(info);
        this.axios = axios.create({
            baseURL: `${info.pmURL}/api2/json/`,
            headers: {
                Authorization: `PVEAPIToken=${info.pmUsername}!${info.pmTokenName}=${info.pmToken}`
            }
        });
    }

    override async stop(): Promise<boolean> {
        const success = await super.stop();
        if (!success) return false;
        this.givenServerStatus = "stopping";
        try {
            await this.axios.post<PMResponse<null>>(`nodes/${this.info.name}/status`, {
                command: "shutdown"
            });
            this.givenServerStatus = null;
            this.startedTime = undefined;
            return true;
        } catch (err) {
            this.givenServerStatus = null;
            throw err;
        }
    }

    async startVM(name: string): Promise<boolean> {
        const status = await this.getServerStatus();
        if (status !== "running") return false;
        try {
            interface VM {
                vmid: number,
                name: string,
                status: "stopped" | "running",
            }
            const response = await this.axios.get<PMResponse<VM[]>>(`nodes/${this.info.name}/qemu/`);

            for (const vm of response.data.data) {
                if (vm.name === name) {
                    const response = await this.axios.get<PMResponse<VM>>(`nodes/${this.info.name}/qemu/${vm.vmid}/status/current`);
                    if (response.data.data.status === "running") return true;
                    await this.axios.post<PMResponse<string>>(`nodes/${this.info.name}/qemu/${vm.vmid}/status/start`);
                    return true;
                }
            }
            return false;
        } catch (err) {
            throw err;
        }
    }

    async shutdownVM(name: string): Promise<boolean> {
        const status = await this.getServerStatus();
        if (status !== "running") return true;
        try {
            interface VM {
                vmid: number,
                name: string,
                status: "stopped" | "running",
            }
            const response = await this.axios.get<PMResponse<VM[]>>(`nodes/${this.info.name}/qemu/`);

            for (const vm of response.data.data) {
                if (vm.name === name) {
                    const response = await this.axios.get<PMResponse<VM>>(`nodes/${this.info.name}/qemu/${vm.vmid}/status/current`);
                    if (response.data.data.status === "stopped") return true;
                    await this.axios.post<PMResponse<string>>(`nodes/${this.info.name}/qemu/${vm.vmid}/status/shutdown`);
                    return true
                }
            }
            return false;
        } catch (err) {
            throw err;
        }
    }
}