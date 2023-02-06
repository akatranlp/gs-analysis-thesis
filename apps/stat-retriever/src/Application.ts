import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { APIClient } from "./APIClient";
import { Config, Server } from "./Config";
import { getMilliSecondsToInterval } from "utils";


export class Application {
    private apiClient
    private influxClient
    private servers: Server[]
    private influxOrg: string
    private influxBucket: string
    private interval: number

    constructor(config: Config) {
        const { host,
            username,
            password,
            WANInterfaceName,
            influxURL,
            influxToken } = config

        this.influxOrg = config.influxOrg
        this.influxBucket = config.influxBucket
        this.interval = config.interval
        this.servers = config.servers

        this.apiClient = new APIClient(host, username, password, WANInterfaceName);
        this.influxClient = new InfluxDB({ url: influxURL, token: influxToken });
    }

    async writePlayerCountStatsToInfluxDB() {
        const writeApi = this.influxClient.getWriteApi(this.influxOrg, this.influxBucket);
        const currentDate = new Date();
        for (const { ip, name, port, protocol } of this.servers) {
            const states = await this.apiClient.getCurrentStates(ip, port, protocol);
            const point = new Point("serverStatus")
                .tag("name", name)
                .tag("ip", ip)
                .tag("port", "" + port)
                .tag("protocol", protocol)
                .uintField("playerCount", states.length)
                .booleanField("isOnline", true)
                .timestamp(currentDate);
            writeApi.writePoint(point);
        }
        await writeApi.close();
    }

    async loop() {
        await this.writePlayerCountStatsToInfluxDB();
        setTimeout(async () => {
            await this.loop()
        }, getMilliSecondsToInterval(this.interval));
    }
}
