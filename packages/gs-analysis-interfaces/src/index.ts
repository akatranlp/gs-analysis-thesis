import { serverInfoValidator, Server, ServerInfo, } from "./server/interfaces";

import { HostServer, isHostServer, hostServerInfoValidator, HostServerInfo } from "./server/hostServer/hostServer";
import { HardwareHostServer, isHardwareHostServer, hardwareHostServerInfoValidator, HardwareHostServerInfo } from "./server/hostServer/hardwareHostServer";
import { ProxmoxHostServer, isProxmoxHostServer, proxmoxHostServerInfoValidator, ProxmoxHostServerInfo } from "./server/hostServer/proxmoxHostServer";

import { VMServer, isVMServer, vmServerInfoValidator, VMServerInfo } from "./server/vmServer/index";

import { GameServer, isGameServer, gameServerInfoValidator, GameServerInfo } from "./server/gameServer/gameServer";
import { CommonGameServer, isCommonGameServer, commonGameServerInfoValidator, CommonGameServerInfo } from "./server/gameServer/commonGameServer";
import { RconGameServer, isRconGameServer, rconGameServerInfoValidator, RconGameServerInfo } from "./server/gameServer/rconGameServer";

export {
  serverInfoValidator,

  HostServer, isHostServer, hostServerInfoValidator,
  HardwareHostServer, isHardwareHostServer, hardwareHostServerInfoValidator,
  ProxmoxHostServer, isProxmoxHostServer, proxmoxHostServerInfoValidator,

  VMServer, isVMServer, vmServerInfoValidator,

  GameServer, isGameServer, gameServerInfoValidator,
  CommonGameServer, isCommonGameServer, commonGameServerInfoValidator,
  RconGameServer, isRconGameServer, rconGameServerInfoValidator,
}

export type {
  Server, ServerInfo,
  HostServerInfo, HardwareHostServerInfo, ProxmoxHostServerInfo,
  VMServerInfo,
  GameServerInfo, RconGameServerInfo, CommonGameServerInfo,
}