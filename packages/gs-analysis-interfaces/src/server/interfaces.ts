import { z } from "zod";

export const serverInfoValidator = z
    .object({
        name: z.string(),
        type: z.enum(["hw", "vm", "gs"]),
    }).passthrough();

export type ServerInfo = z.infer<typeof serverInfoValidator>;
export interface Server {
    givenServerStatus: "starting" | "stopping" | null
    info: ServerInfo
}
