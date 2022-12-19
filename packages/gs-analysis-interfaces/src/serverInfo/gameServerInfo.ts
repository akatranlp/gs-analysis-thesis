import { z } from "zod";
import { serverInfoValidator } from "./serverInfo";

export const gameServerInfoValidator = serverInfoValidator
  .omit({ type: true })
  .extend({
    type: z.literal("gs"),
    gsType: z.string(),
    hosting: z.enum(["docker", "process"]),
    hostServer: z.string(),
  });

export const processGameServerInfoValidator = gameServerInfoValidator
  .omit({ hosting: true })
  .extend({
    hosting: z.literal("process"),
    processName: z.string(),
  });

export const dockerGameServerInfoValidator = gameServerInfoValidator
  .omit({ hosting: true })
  .extend({
    hosting: z.literal("docker"),
    containerName: z.string(),
  });

export type GameServerInfo = z.infer<typeof gameServerInfoValidator>;
export type ProcessGameServerInfo = z.infer<
  typeof processGameServerInfoValidator
>;
export type DockerGameServerInfo = z.infer<
  typeof dockerGameServerInfoValidator
>;
