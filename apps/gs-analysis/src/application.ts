import { PluginLoader } from "./pluginLoader";
import { getMilliSecondsToInterval } from "utils";
import {
  serverInfoValidator,
  hostServerInfoValidator,
  gameServerInfoValidator,
  rconGameServerInfoValidator,
  ServerInfo,
  HostServer,
  GameServer,
  RconGameServer,
  StatusInfo
} from "gs-analysis-interfaces";

import { z } from "zod";
import fs from "fs/promises";
import Fastify from "fastify";

export const configParser = z.object({
  apiPort: z.number().min(0).max(65535),
  timeout: z.number().min(1).max(60),
  interval: z.number().min(0.1).max(60),
  servers: z.array(serverInfoValidator)
});

type Config = z.infer<typeof configParser>

export class Application {
  private pluginLoader = new PluginLoader();
  private intervalId?: NodeJS.Timer;
  private continueLoop = true;
  private rootServers: Record<string, HostServer> = {};
  private hwServers: Record<string, HostServer> = {};
  private gsServers: Record<string, GameServer> = {};
  private statusGraph: Record<string, StatusInfo> = {};
  private lastStatusUpdate = new Date();
  private fastify = Fastify({ logger: true });

  constructor(private config: Config) { }

  async parseConfig(serverInfos: ServerInfo[], timeout: number) {
    const hwServers = serverInfos.filter(entry => entry.type === "hw").map(entry => hostServerInfoValidator.parse(entry));

    for (const rootServerConfig of hwServers.filter(entry => entry.hostServer == null)) {
      this.rootServers[rootServerConfig.name] = new HostServer(rootServerConfig, null);
    }

    for (const serverConfig of hwServers.filter(entry => entry.hostServer != null)) {
      const hostServer = this.rootServers[serverConfig.hostServer!];
      const server = new HostServer(serverConfig, hostServer);
      this.hwServers[serverConfig.name] = server
      hostServer.appendChild(server);
    }

    for (const unparsedConfig of serverInfos.filter(entry => entry.type === "gs")) {
      const config = await gameServerInfoValidator.parseAsync(unparsedConfig);
      const hostServer = this.rootServers[config.hostServer] || this.hwServers[config.hostServer];
      if (config.rconPassword && config.rconPort) {
        const rconConfig = await rconGameServerInfoValidator.parseAsync(config);
        const server = new RconGameServer(rconConfig, timeout, hostServer);
        this.gsServers[config.name] = server;
        hostServer.appendChild(server);
      } else {
        const server = new GameServer(config, timeout, hostServer);
        this.gsServers[config.name] = server;
        hostServer.appendChild(server);
      }
    }
  }

  async run() {
    await this.parseConfig(this.config.servers, this.config.timeout);
    await this.start();

    this.fastify.get("/api", async () => {
      return { hello: "world" }
    });

    try {
      await this.fastify.listen({ port: this.config.apiPort });
    } catch (err) {
      this.fastify.log.error(err);
      process.exit(1);
    }
  }

  async start() {
    this.continueLoop = true;
    return this.loop();
  }

  private async loop() {
    const statusGraph: Record<string, StatusInfo> = {}
    for (const [name, server] of Object.entries(this.rootServers)) {
      const status = await server.statusInfo(null);
      statusGraph[name] = status;
    }
    this.statusGraph = statusGraph;
    this.lastStatusUpdate = new Date();
    console.log(this.lastStatusUpdate);

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
}
