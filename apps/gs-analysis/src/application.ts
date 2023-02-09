import { getMilliSecondsToInterval } from "utils";
import {
  hostServerInfoValidator,
  gameServerInfoValidator,
  rconGameServerInfoValidator,
  HostServer,
  GameServer,
  RconGameServer,
  StatusInfo
} from "gs-analysis-interfaces";
import { Config } from "./config";

export class Application {
  private intervalId?: NodeJS.Timer;
  private continueLoop = true;
  rootServers: Record<string, HostServer> = {};
  hwServers: Record<string, HostServer> = {};
  gsServers: Record<string, GameServer> = {};
  statusGraph: Record<string, StatusInfo> | null = null;
  lastStatusUpdate = new Date();

  constructor(public config: Config) {
    const hwServers = this.config.servers.filter(entry => entry.type === "hw").map(entry => hostServerInfoValidator.parse(entry));

    for (const rootServerConfig of hwServers.filter(entry => entry.hostServer == null)) {
      this.rootServers[rootServerConfig.name] = new HostServer(rootServerConfig, null);
    }

    for (const serverConfig of hwServers.filter(entry => entry.hostServer != null)) {
      const hostServer = this.rootServers[serverConfig.hostServer!];
      const server = new HostServer(serverConfig, hostServer);
      this.hwServers[serverConfig.name] = server;
      hostServer.appendChild(server);
    }

    for (const unparsedConfig of this.config.servers.filter(entry => entry.type === "gs")) {
      const config = gameServerInfoValidator.parse(unparsedConfig);
      const hostServer = this.rootServers[config.hostServer] || this.hwServers[config.hostServer];
      if (config.rconPassword && config.rconPort) {
        const rconConfig = rconGameServerInfoValidator.parse(config);
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

  async start() {
    this.continueLoop = true;
    return this.loop();
  }

  private async loop() {
    if (this.config.stopIfNeeded) {
      this.statusGraph = await this.stopServersIfNeeded(null, null);
    } else {
      this.statusGraph = await this.getServerStatusInfo(true, null);
    }
    this.lastStatusUpdate = new Date();

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

  async getServerStatusInfo(updateFromApplication: boolean, serverName: string | null) {
    if (serverName == null) {
      if (!updateFromApplication && this.statusGraph != null) {
        return this.statusGraph;
      }

      const map: Record<string, StatusInfo> = {}
      for (const [name, rootServer] of Object.entries(this.rootServers)) {
        map[name] = await rootServer.statusInfo(null, this.config.timeout);
      }
      return map;
    }

    let server
    if (serverName in this.gsServers) server = this.gsServers[serverName];
    else if (serverName in this.hwServers) server = this.hwServers[serverName];
    else if (serverName in this.rootServers) server = this.rootServers[serverName];
    else throw new Error("Server not configured!");
    return { [serverName]: await server.statusInfo(null, this.config.timeout) };
  }

  async stopServersIfNeeded(serverName: string | null, timeout: number | null) {
    if (serverName == null) {
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

  async startServer(serverName: string) {
    let server
    if (serverName in this.gsServers) server = this.gsServers[serverName];
    else if (serverName in this.hwServers) server = this.hwServers[serverName];
    else if (serverName in this.rootServers) server = this.rootServers[serverName];
    else throw new Error("Server not configured!");
    return server.start();
  }

  async stopServer(serverName: string) {
    let server
    if (serverName in this.gsServers) server = this.gsServers[serverName];
    else if (serverName in this.hwServers) server = this.hwServers[serverName];
    else if (serverName in this.rootServers) server = this.rootServers[serverName];
    else throw new Error("Server not configured!");
    return server.stop();
  }
}
