import { getMilliSecondsToInterval } from "utils";
import {
  serverInfoValidator,
  hostServerInfoValidator,
  gameServerInfoValidator,
  rconGameServerInfoValidator,
  HostServer,
  GameServer,
  RconGameServer,
  StatusInfo
} from "gs-analysis-interfaces";

import { z } from "zod";

export const configParser = z.object({
  discordBotToken: z.string(),
  stopIfNeeded: z.boolean(),
  apiPort: z.number().min(0).max(65535),
  timeout: z.number().min(1).max(60),
  interval: z.number().min(0.1).max(60),
  servers: z.array(serverInfoValidator)
});

type Config = z.infer<typeof configParser>

export class Application {
  private intervalId?: NodeJS.Timer;
  private continueLoop = true;
  rootServers: Record<string, HostServer> = {};
  hwServers: Record<string, HostServer> = {};
  gsServers: Record<string, GameServer> = {};
  statusGraph: Record<string, StatusInfo> = {};
  lastStatusUpdate = new Date();

  constructor(public config: Config) { }

  async parseConfig() {
    const hwServers = this.config.servers.filter(entry => entry.type === "hw").map(entry => hostServerInfoValidator.parse(entry));

    for (const rootServerConfig of hwServers.filter(entry => entry.hostServer == null)) {
      this.rootServers[rootServerConfig.name] = new HostServer(rootServerConfig, null);
    }

    for (const serverConfig of hwServers.filter(entry => entry.hostServer != null)) {
      const hostServer = this.rootServers[serverConfig.hostServer!];
      const server = new HostServer(serverConfig, hostServer);
      this.hwServers[serverConfig.name] = server
      hostServer.appendChild(server);
    }

    for (const unparsedConfig of this.config.servers.filter(entry => entry.type === "gs")) {
      const config = await gameServerInfoValidator.parseAsync(unparsedConfig);
      const hostServer = this.rootServers[config.hostServer] || this.hwServers[config.hostServer];
      if (config.rconPassword && config.rconPort) {
        const rconConfig = await rconGameServerInfoValidator.parseAsync(config);
        const server = new RconGameServer(rconConfig, hostServer);
        this.gsServers[config.name] = server;
        hostServer.appendChild(server);
      } else {
        const server = new GameServer(config, hostServer);
        this.gsServers[config.name] = server;
        hostServer.appendChild(server);
      }
    }
  }

  async run() {
    await this.parseConfig();
    await this.start();
  }

  async start() {
    this.continueLoop = true;
    return this.loop();
  }

  private async loop() {
    const statusGraph: Record<string, StatusInfo> = {}
    for (const [name, server] of Object.entries(this.rootServers)) {
      let status;
      if (this.config.stopIfNeeded) {
        status = await server.stopIfNeeded(null, this.config.timeout);
      } else {
        status = await server.statusInfo(null, this.config.timeout);
      }
      statusGraph[name] = status;
    }
    this.statusGraph = statusGraph;
    this.lastStatusUpdate = new Date();
    console.log(this.lastStatusUpdate.toLocaleString("de-DE"));

    if (this.continueLoop) {
      this.intervalId = setTimeout(async () => {
        await this.loop();
      }, getMilliSecondsToInterval(this.config.interval));
    }
  }

  async stop() {
    this.continueLoop = false;
    if (this.intervalId) clearInterval(this.intervalId);
  }

  async stopServersIfNeeded(serverName: string | undefined, timeout: number | undefined) {
    if (serverName == undefined) {
      const map: Record<string, StatusInfo> = {}
      for (const [name, rootServer] of Object.entries(this.rootServers)) {
        map[name] = await rootServer.stopIfNeeded(null, timeout === 0 ? 0 : timeout || this.config.timeout);
      }
      return map;
    }

    let server
    if (serverName in this.gsServers) server = this.gsServers[serverName];
    else if (serverName in this.hwServers) server = this.hwServers[serverName];
    else if (serverName in this.rootServers) server = this.rootServers[serverName];
    else throw new Error("Server not configured!");
    return { [serverName]: await server.stopIfNeeded(null, timeout === 0 ? 0 : timeout || this.config.timeout) };
  }
}
