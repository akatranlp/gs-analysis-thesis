import { Application } from "./application";
import { Client } from "discord.js";


export const createDiscordBot = async (app: Application) => {
    const client = new Client({ intents: [] });

    client.once("ready", () => {
        console.log("Discord Bot connected!");
    });

    await client.login(app.config.discordBotToken);
}