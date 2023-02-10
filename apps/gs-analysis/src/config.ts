import fs from "fs/promises";
import { serverInfoValidator } from "gs-analysis-interfaces";
import { z } from "zod";

export const configParser = z.object({
    discord: z.object({
        botToken: z.string(),
        applicationId: z.string(),
        guildId: z.string(),
        channelId: z.string()
    }),
    stopIfNeeded: z.boolean(),
    apiPort: z.number().min(0).max(65535),
    timeout: z.number().min(5).max(60),
    interval: z.number().min(0.1).max(5),
    servers: z.array(serverInfoValidator)
});

export type Config = z.infer<typeof configParser>

export const loadAndParseConfig = async (path: string) => {
    return configParser.parseAsync(JSON.parse(await fs.readFile(path, "utf8")));
}
