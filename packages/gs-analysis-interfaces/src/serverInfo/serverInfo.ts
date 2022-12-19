import { z } from "zod";

export const serverInfoValidator = z.object({
  name: z.string(),
  type: z.enum(["hw", "vm", "gs"]),
}).passthrough();

export const hwServerInfoValidator = serverInfoValidator
  .omit({ type: true })
  .extend({
    type: z.literal("hw"),
    ipAdress: z.string().min(7).max(15),
    username: z.string(),
    password: z.string(),
    osType: z.enum(["linux", "windows"]),
    vmHostType: z.string().optional(),
  });

export const vmServerInfoValidator = hwServerInfoValidator
  .omit({ type: true, vmHostType: true })
  .extend({
    type: z.literal("vm"),
    hostServer: z.string(),
  });

export type ServerInfo = z.infer<typeof serverInfoValidator>;
export type HWServerInfo = z.infer<typeof hwServerInfoValidator>;
export type VMServerInfo = z.infer<typeof vmServerInfoValidator>;
