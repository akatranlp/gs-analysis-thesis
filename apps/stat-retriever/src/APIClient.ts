import axios from "axios";

export class APIClient {
    private axiosInstance

    constructor(host: string, username: string, password: string, private interfaceName: string) {
        this.axiosInstance = axios.create({
            baseURL: `https://${host}/api/v1/firewall/states`,
            auth: {
                username,
                password
            },
            responseType: "json"
        });
    }

    async getCurrentStates(host: string, port: number, protocol: "tcp" | "udp") {
        const response = await this.axiosInstance.get("", {
            data: {
                interface__startswith: this.interfaceName,
                status__startswith: protocol == "udp" ? "MULTIPLE:MULTIPLE" : "ESTABLISHED:ESTABLISHED",
                destination__startswith: `${host}:${port}`,
            }
        });
        return response.data.data ? Object.values(response.data.data) : []
    }
}
