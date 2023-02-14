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
import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { createLogger } from "logger";

const influxLog = createLogger("InfluxDB");
const appLog = createLogger("App");


export class Application {
  private influxClient
  private intervalId?: NodeJS.Timer;
  private continueLoop = false;
  rootServers: Record<string, HostServer> = {};
  vmServers: Record<string, VMServer> = {};
  gsServers: Record<string, GameServer> = {};
  statusGraph: StatusInfo[] | null = null;
  shutdownedServers: string[] = [];
  lastStatusUpdate = new Date();
  private discordBot: Client | null = null;

  constructor(public config: Config) {
    this.influxClient = new InfluxDB({ url: config.influx.url, token: config.influx.token });

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
    if (this.config.app.stopIfNeeded) {
      appLog("Run loop stop servers if needed");
      await this.stopServersIfNeeded(null, null);
    } else {
      appLog("Run loop getting statusinfo");
      await this.getServerStatusInfo(true, null);
    }
    try {
      await this.sendDataToInflux();
    } catch (e) {
      influxLog((e as Error).message)
    }
    this.lastStatusUpdate = new Date();

    if (this.continueLoop) {
      this.intervalId = setTimeout(async () => {
        await this.loop();
      }, getMilliSecondsToInterval(this.config.app.interval));
    }
  }

  async stop() {
    this.continueLoop = false;
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async sendDataToInflux() {
    if (!this.statusGraph) return;
    const writeApi = this.influxClient.getWriteApi(this.config.influx.org, this.config.influx.bucket);
    const currentDate = new Date();

    influxLog("Start sending data!");

    for (const rootInfo of Object.values(this.statusGraph)) {
      const inactivePoint = new Point("onlineInactiveStatus")
        .tag("name", `${rootInfo.name}-Inactive`)
        .floatField("value", rootInfo.isInactive ? 1.5 : 0)
        .timestamp(currentDate);

      const onlinePoint = new Point("onlineInactiveStatus")
        .tag("name", `${rootInfo.name}-Online`)
        .floatField("value", (rootInfo.status === "running" || rootInfo.status === "starting") ? 1 : 0)
        .timestamp(currentDate);

      writeApi.writePoint(inactivePoint);
      writeApi.writePoint(onlinePoint);

      if (!rootInfo.childrenInfo) continue;
      for (const vmInfo of rootInfo.childrenInfo) {
        const inactivePoint = new Point("onlineInactiveStatus")
          .tag("name", `${vmInfo.name}-Inactive`)
          .floatField("value", vmInfo.isInactive ? 1.5 : 0)
          .timestamp(currentDate);

        const onlinePoint = new Point("onlineInactiveStatus")
          .tag("name", `${vmInfo.name}-Online`)
          .floatField("value", (vmInfo.status === "running" || vmInfo.status === "starting") ? 1 : 0)
          .timestamp(currentDate);

        writeApi.writePoint(inactivePoint);
        writeApi.writePoint(onlinePoint);

        if (vmInfo.type === "gs") {
          const point = new Point("playerCount")
            .tag("name", vmInfo.name)
            .uintField("playerCount", vmInfo.playerCount!)
            .timestamp(currentDate);

          writeApi.writePoint(point);
        }

        if (!vmInfo.childrenInfo) continue;
        for (const gsInfo of vmInfo.childrenInfo) {
          const inactivePoint = new Point("onlineInactiveStatus")
            .tag("name", `${gsInfo.name}-Inactive`)
            .floatField("value", gsInfo.isInactive ? 1.5 : 0)
            .timestamp(currentDate);

          const onlinePoint = new Point("onlineInactiveStatus")
            .tag("name", `${gsInfo.name}-Online`)
            .floatField("value", (gsInfo.status === "running" || gsInfo.status === "starting") ? 1 : 0)
            .timestamp(currentDate);

          writeApi.writePoint(inactivePoint);
          writeApi.writePoint(onlinePoint);

          const point = new Point("playerCount")
            .tag("name", gsInfo.name)
            .uintField("playerCount", gsInfo.playerCount!)
            .timestamp(currentDate);

          writeApi.writePoint(point);
        }
      }
    }

    await writeApi.close();
  }

  async getServerStatusInfo(updateFromApplication: boolean, serverName: string | null) {
    if (serverName == null) {
      if (!updateFromApplication && this.continueLoop && this.statusGraph != null) {
        return this.statusGraph;
      }

      const values = await Promise.all(Object.values(this.rootServers)
        .map((rootServer) => rootServer.statusInfo(this.config.app.timeout)))

      this.statusGraph = values;
      return values;
    }

    let info: StatusInfo
    if (serverName in this.gsServers) {
      info = await this.gsServers[serverName].statusInfo(null, this.config.app.timeout)
    } else if (serverName in this.vmServers) {
      info = await this.vmServers[serverName].statusInfo(null, this.config.app.timeout)
    } else if (serverName in this.rootServers) {
      info = await this.rootServers[serverName].statusInfo(this.config.app.timeout)
    }
    else throw new Error("Server not configured!");
    return [info];
  }

  async stopServersIfNeeded(serverName: string | null, timeout: number | null) {
    timeout = timeout === 0 ? 0 : timeout || this.config.app.timeout
    if (serverName == null) {

      this.shutdownedServers = []
      const values = (await Promise.all(Object.values(this.rootServers).map(rootServer => rootServer.stopIfNeeded(timeout!))))
        .map(info => {
          this.shutdownedServers = [...this.shutdownedServers, ...info.shutdownedServers]
          return {
            ...info,
            shutdownedServers: []
          }
        })

      if (this.discordBot) this.discordBot.emit("stop-if-needed", this.shutdownedServers);
      this.statusGraph = values;
      return values;
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
    this.shutdownedServers = info.shutdownedServers;
    return [info];
  }

  async startServer(serverName: string) {
    if (serverName in this.gsServers) {
      const success = await this.gsServers[serverName].start();
      await this.getServerStatusInfo(true, null);
      return success;
    } else if (serverName in this.vmServers) {
      const success = await this.vmServers[serverName].start();
      await this.getServerStatusInfo(true, null);
      return success;
    } else if (serverName in this.rootServers) {
      const success = await this.rootServers[serverName].start();
      await this.getServerStatusInfo(true, null);
      return success;
    }
    else throw new Error("Server not configured!");
  }

  async stopServer(serverName: string) {
    if (serverName in this.gsServers) {
      const success = await this.gsServers[serverName].stop(null);
      await this.getServerStatusInfo(true, null);
      return success;
    } else if (serverName in this.vmServers) {
      const success = await this.vmServers[serverName].stop();
      await this.getServerStatusInfo(true, null);
      return success;
    } else if (serverName in this.rootServers) {
      const success = await this.rootServers[serverName].stop();
      await this.getServerStatusInfo(true, null);
      return success;
    }
    else throw new Error("Server not configured!");
  }
}
