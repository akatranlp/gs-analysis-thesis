import fs from "fs/promises";
import { serverInfoValidator } from "gs-analysis-interfaces";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config()

export const configParser = z.object({
    discord: z.object({
        botToken: z.string().default(process.env.DISCORD_BOTTOKEN!),
        applicationId: z.string().default(process.env.DISCORD_APPLICATIONID!),
        guildId: z.string().default(process.env.DISCORD_GUILDID!),
        channelId: z.string().default(process.env.DISCORD_CHANNELID!),
    }).default({}),
    influx: z.object({
        url: z.string().url().default(process.env.INFLUX_URL!),
        token: z.string().default(process.env.INFLUX_TOKEN!),
        org: z.string().default(process.env.INFLUX_ORG!),
        bucket: z.string().default(process.env.INFLUX_BUCKET!),
    }).default({}),
    api: z.object({
        port: z.number().min(0).max(65535).default(process.env.API_PORT ? Number(process.env.API_PORT) : 3000),
    }).default({}),
    app: z.object({
        stopIfNeeded: z.boolean().default(process.env.APP_STOPIFNEEDED ? process.env.APP_STOPIFNEEDED === "true" : false),
        timeout: z.number().min(5).max(60).default(process.env.APP_TIMEOUT ? Number(process.env.APP_TIMEOUT) : 5),
        interval: z.number().min(0.1).max(5).default(process.env.APP_INTERVAL ? Number(process.env.APP_INTERVAL) : 0.5),
    }).default({}),
    servers: z.array(serverInfoValidator)
});

export type Config = z.infer<typeof configParser>

export const loadAndParseConfig = async () => {
    return configParser.parseAsync(JSON.parse(await fs.readFile(process.env.CONFIG_FILE ?? "./config.json", "utf8")));
}
