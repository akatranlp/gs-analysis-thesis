import fs from "fs/promises";
import { APIClient } from "./APIClient";

interface Server {
    name: string
    host: string
    port: number
    protocol: "tcp" | "udp"
}

interface Config {
    host: string
    username: string
    password: string
    WANInterfaceName: string
    outputFile: string
    interval: number
    servers: Server[]
}

const getMilliSecondsToInterval = (interval: number) => {
    const coeff = 1000 * 60 * interval;
    const currentDate = new Date()
    const date = new Date(Math.ceil(currentDate.getTime() / coeff) * coeff);

    return date.getTime() - currentDate.getTime();
}

const writePlayerCountStats = async (apiClient: APIClient, servers: Server[], outputFile: string) => {
    const currentDate = new Date();
    const dateString = currentDate.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
    const timeString = currentDate.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin" });
    let appendString = ""
    for (const { host, name, port, protocol } of servers) {
        const states = await apiClient.getCurrentStates(host, port, protocol);
        appendString += `${dateString};${timeString};${name};${host};${port};${protocol};${states.length};\n`
    }
    await fs.appendFile(outputFile, appendString)
}

const loop = async (apiClient: APIClient, servers: Server[], outputFile: string, interval: number) => {
    writePlayerCountStats(apiClient, servers, outputFile)
    setTimeout(() => {
        loop(apiClient, servers, outputFile, interval)
    }, getMilliSecondsToInterval(interval));
}

const main = async () => {
    const config = JSON.parse(await fs.readFile(process.env.CONFIG_FILE || "config.json", "utf-8")) as Config;
    const apiClient = new APIClient(config.host, config.username, config.password, config.WANInterfaceName);
    loop(apiClient, config.servers, config.outputFile, config.interval)
}

main()
