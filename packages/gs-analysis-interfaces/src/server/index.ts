import { VMServerInfo, HostServerInfo, GameServerInfo } from "../serverInfo";

export class HostServer {
  private name;
  private ipAdress;
  private username;
  private password;
  private osType;
  private children;
  constructor(
    { name, ipAdress, username, password, osType }: HostServerInfo,
    children: string[]
  ) {
    this.name = name;
    this.ipAdress = ipAdress;
    this.username = username;
    this.password = password;
    this.osType = osType;
    this.children = children;
  }

  async statusInfo() {
    // check children if inactive then this is inactive
  }

  async stop() {
    // shutdown this if unactive
  }

  async shutdownGameserver({ hosting, internalName }: GameServerInfo) {
    if (hosting == "docker") {
      // stop docker container
    } else {
      // stop process by process name
    }
  }
}

export class VMServer extends HostServer {
  private hostServer;
  constructor(serverInfo: VMServerInfo, children: string[]) {
    super(serverInfo, children);

    const { hostServer } = serverInfo;
    this.hostServer = hostServer;
  }

  override async statusInfo() {}
}

export class GameServer {
  private name;
  private gsType;
  private hosting;
  private hostServer;
  constructor(
    { name, gsType, hosting }: GameServerInfo,
    hostServer: HostServer
  ) {
    this.name = name;
    this.gsType = gsType;
    this.hosting = hosting;
    this.hostServer = hostServer;
  }

  async statusInfo() {
    return {
      isInactive: true,
    };
  }

  protected async stop() {}

  async stopIfInactive() {
    const statusInfo = await this.statusInfo();
    if (statusInfo.isInactive) {
      await this.stop();
    }
  }
}
