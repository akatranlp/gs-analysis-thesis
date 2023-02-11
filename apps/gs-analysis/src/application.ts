import { getMilliSecondsToInterval } from "utils";
import {
  hostServerInfoValidator,
  gameServerInfoValidator,
  rconGameServerInfoValidator,
  HostServer,
  GameServer,
  RconGameServer,
  VMServer,
  vmServerInfoValidator,
  hardwareHostServerInfoValidator,
  proxmoxHostServerInfoValidator,
  HardwareHostServer,
  ProxmoxHostServer,
  commonGameServerInfoValidator,
  CommonGameServer,
  isProxmoxHostServer,
  isHardwareHostServer,
  isVMServer,
} from "gs-analysis-interfaces";

import { StatusInfo } from "gs-analysis-types";
import { Config } from "./config";
import { Client } from "discord.js";

export class Application {
  private intervalId?: NodeJS.Timer;
  private continueLoop = true;
  rootServers: Record<string, HostServer> = {};
  vmServers: Record<string, VMServer> = {};
  gsServers: Record<string, GameServer> = {};
  statusGraph: Record<string, StatusInfo> | null = null;
  lastStatusUpdate = new Date();
  private discordBot: Client | null = null;

  constructor(public config: Config) {
    const rootServers = this.config.servers.filter(entry => entry.type === "hw").map(entry => hostServerInfoValidator.parse(entry));
    const vmServers = this.config.servers.filter(entry => entry.type === "vm").map(entry => vmServerInfoValidator.parse(entry));
    const gsServers = this.config.servers.filter(entry => entry.type === "gs").map(entry => gameServerInfoValidator.parse(entry));

    for (const rootServerConfig of rootServers) {
      if (rootServerConfig.hostType === "none") {
        const config = hardwareHostServerInfoValidator.parse(rootServerConfig);
        this.rootServers[rootServerConfig.name] = new HardwareHostServer(config);
      } else if (rootServerConfig.hostType === "proxmox") {
        const config = proxmoxHostServerInfoValidator.parse(rootServerConfig);
        this.rootServers[rootServerConfig.name] = new ProxmoxHostServer(config);
      }
    }

    for (const serverConfig of vmServers) {
      const hostServer = this.rootServers[serverConfig.hostServer];
      if (!isProxmoxHostServer(hostServer)) throw new Error("HostServer is not a VMHost");
      const server = new VMServer(serverConfig, hostServer);
      this.vmServers[serverConfig.name] = server;
      hostServer.addChild(server);
    }

    for (const gameserverConfig of gsServers) {
      const hostServer = this.rootServers[gameserverConfig.hostServer] || this.vmServers[gameserverConfig.hostServer];
      if (!(isHardwareHostServer(hostServer) || isVMServer(hostServer))) throw new Error("HostServer is not a Dockerhost");
      if (gameserverConfig.checkType === "common") {
        const config = commonGameServerInfoValidator.parse(gameserverConfig);
        const server = new CommonGameServer(config, hostServer.dockerHost);
        this.gsServers[config.name] = server;
        hostServer.addChild(server);
      } else if (gameserverConfig.checkType === "rcon") {
        const config = rconGameServerInfoValidator.parse(gameserverConfig);
        const server = new RconGameServer(config, hostServer.dockerHost);
        this.gsServers[config.name] = server;
        hostServer.addChild(server);
      }
    }
  }

  installDiscordBot(discordBot: Client) {
    this.discordBot = discordBot;
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
        map[name] = await rootServer.statusInfo(this.config.timeout);
      }
      return map;
    }

    let info: StatusInfo
    if (serverName in this.gsServers) {
      info = await this.gsServers[serverName].statusInfo(null, this.config.timeout)
    } else if (serverName in this.vmServers) {
      info = await this.vmServers[serverName].statusInfo(null, this.config.timeout)
    } else if (serverName in this.rootServers) {
      info = await this.rootServers[serverName].statusInfo(this.config.timeout)
    }
    else throw new Error("Server not configured!");
    return { [serverName]: info };
  }

  async stopServersIfNeeded(serverName: string | null, timeout: number | null) {
    timeout = timeout === 0 ? 0 : timeout || this.config.timeout
    if (serverName == null) {
      const map: Record<string, StatusInfo> = {}
      let shutdownedServers: string[] = []
      for (const [name, rootServer] of Object.entries(this.rootServers)) {
        const info = await rootServer.stopIfNeeded(timeout);
        shutdownedServers = [...shutdownedServers, ...info.shutdownedServers]
        map[name] = info;
      }
      if (this.discordBot) this.discordBot.emit("stop-if-needed", shutdownedServers);
      return map;
    }

    let info: StatusInfo
    if (serverName in this.gsServers) {
      info = await this.gsServers[serverName].stopIfNeeded(null, timeout);
    } else if (serverName in this.vmServers) {
      info = await this.vmServers[serverName].stopIfNeeded(null, timeout);
    } else if (serverName in this.rootServers) {
      info = await this.rootServers[serverName].stopIfNeeded(timeout);
    }
    else throw new Error("Server not configured!");
    if (this.discordBot) this.discordBot.emit("stop-if-needed", info.shutdownedServers);
    return { [serverName]: info };
  }

  async startServer(serverName: string) {
    if (serverName in this.gsServers) {
      return this.gsServers[serverName].start();
    } else if (serverName in this.vmServers) {
      return this.vmServers[serverName].start();
    } else if (serverName in this.rootServers) {
      return this.rootServers[serverName].start();
    }
    else throw new Error("Server not configured!");
  }

  async stopServer(serverName: string) {
    if (serverName in this.gsServers) {
      return this.gsServers[serverName].stop(null);
    } else if (serverName in this.vmServers) {
      return this.vmServers[serverName].stop();
    } else if (serverName in this.rootServers) {
      return this.rootServers[serverName].stop();
    }
    else throw new Error("Server not configured!");
  }
}
