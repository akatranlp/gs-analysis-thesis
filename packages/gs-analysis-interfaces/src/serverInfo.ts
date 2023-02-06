import { z } from "zod";

export const serverInfoValidator = z
    .object({
        name: z.string(),
        type: z.enum(["hw", "gs"]),
    })
    .passthrough();

export const hostServerInfoValidator = serverInfoValidator
    .omit({ type: true })
    .extend({
        type: z.literal("hw"),
        ipAdress: z.string().min(7).max(15),
        username: z.string(),
        password: z.string(),
        dockerInstalled: z.boolean().default(false),
        hostServer: z.string().optional(),
    });

export const gameServerInfoValidator = serverInfoValidator
    .omit({ type: true })
    .extend({
        type: z.literal("gs"),
        gsType: z.string(),
        hostServer: z.string(),
        internalName: z.string(),
        gamePort: z.number().min(0).max(65535),
        protocol: z.enum(["tcp", "udp"]),
        rconPort: z.number().min(0).max(65535).optional(),
        rconPassword: z.string().optional(),
    });

export const rconGameServerInfoValidator = gameServerInfoValidator.required();

export type ServerInfo = z.infer<typeof serverInfoValidator>;
export type HostServerInfo = z.infer<typeof hostServerInfoValidator>;
export type GameServerInfo = z.infer<typeof gameServerInfoValidator>;
export type RconGameServerInfo = z.infer<typeof rconGameServerInfoValidator>;
