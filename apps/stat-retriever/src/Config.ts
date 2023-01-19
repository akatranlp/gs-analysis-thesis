import { z } from "zod";
import fs from "fs/promises";

export const getConfig = async (path: string) => {
    return configSchema.parseAsync(JSON.parse(await fs.readFile(path, "utf8")));
}

const serverSchema = z.object({
    name: z.string(),
    ip: z.string().regex(/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/),
    port: z.number().min(1).max(65535),
    protocol: z.union([z.literal("tcp"), z.literal("udp")])
});

const configSchema = z.object({
    host: z.string(),
    username: z.string(),
    password: z.string(),
    WANInterfaceName: z.string(),
    outputFile: z.string(),
    interval: z.number().min(1).max(60),
    influxURL: z.string().url(),
    influxToken: z.string(),
    influxOrg: z.string(),
    influxBucket: z.string(),
    servers: z.array(serverSchema)
});

export type Config = z.infer<typeof configSchema>;
export type Server = z.infer<typeof serverSchema>;
export type Protocol = z.infer<typeof serverSchema.shape.protocol>
