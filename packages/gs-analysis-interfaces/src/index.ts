import {
  serverInfoValidator,
  vmServerInfoValidator,
  ServerInfo,
  VMServerInfo,
  gameServerInfoValidator,
  GameServerInfo,
  hostServerInfoValidator,
  HostServerInfo,
} from "./serverInfo";

import { GameServer, HostServer } from "./server";

export {
  gameServerInfoValidator,
  serverInfoValidator,
  vmServerInfoValidator,
  hostServerInfoValidator,
  GameServer,
  HostServer,
};

export type { GameServerInfo, ServerInfo, HostServerInfo, VMServerInfo };
