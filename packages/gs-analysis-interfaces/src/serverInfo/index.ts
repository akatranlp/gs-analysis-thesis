import { z } from "zod";

export const serverInfoValidator = z
  .object({
    name: z.string(),
    type: z.enum(["hw", "vm", "gs"]),
  })
  .passthrough();

export const hostServerInfoValidator = serverInfoValidator
  .omit({ type: true })
  .extend({
    type: z.enum(["hw", "vm"]),
    ipAdress: z.string().min(7).max(15),
    username: z.string(),
    password: z.string(),
    osType: z.enum(["linux", "windows"]),
  });

export const vmServerInfoValidator = hostServerInfoValidator
  .omit({ type: true })
  .extend({
    type: z.literal("vm"),
    hostServer: z.string(),
  });

export const gameServerInfoValidator = serverInfoValidator
  .omit({ type: true })
  .extend({
    type: z.literal("gs"),
    gsType: z.string(),
    hosting: z.enum(["docker", "process"]),
    hostServer: z.string(),
    internalName: z.string(),
  });

export type ServerInfo = z.infer<typeof serverInfoValidator>;
export type HostServerInfo = z.infer<typeof hostServerInfoValidator>;
export type VMServerInfo = z.infer<typeof vmServerInfoValidator>;
export type GameServerInfo = z.infer<typeof gameServerInfoValidator>;
