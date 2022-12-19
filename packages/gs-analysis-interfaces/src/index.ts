import {
  gameServerInfoValidator,
  processGameServerInfoValidator,
  dockerGameServerInfoValidator,
  GameServerInfo,
  ProcessGameServerInfo,
  DockerGameServerInfo,
} from "./serverInfo/gameServerInfo";

import {
  serverInfoValidator,
  hwServerInfoValidator,
  vmServerInfoValidator,
  ServerInfo,
  HWServerInfo,
  VMServerInfo,
} from "./serverInfo/serverInfo";

export {
  gameServerInfoValidator,
  processGameServerInfoValidator,
  dockerGameServerInfoValidator,
  serverInfoValidator,
  hwServerInfoValidator,
  vmServerInfoValidator,
};

export type {
  GameServerInfo,
  ProcessGameServerInfo,
  DockerGameServerInfo,
  ServerInfo,
  HWServerInfo,
  VMServerInfo,
};
