import { Application } from "./application";
import { createFastifyApi } from "./api";
import { createDiscordBot, deployCommands } from "./discord";
import { loadAndParseConfig } from "./config";
import { createLogger } from "logger";

const apiLog = createLogger("API");
const appLog = createLogger("App");
const mainLog = createLogger("Main");
const errorLog = createLogger("Error");

const main = async () => {
    const config = await loadAndParseConfig();

    const app = new Application(config);

    const args = new Set(process.argv.slice(2));

    if (args.size === 0) {
        try {
            mainLog("Starting to launch entire Application!");
            await app.start();
            appLog("App is running!");

            const fastify = createFastifyApi(app);
            await fastify.listen({ port: config.api.port, host: "0.0.0.0" });
            apiLog(`Api is started on Port ${config.api.port}`);

            if (config.discord.useDiscord) {
                const discordClient = createDiscordBot(app);
                await discordClient.login(config.discord.botToken);
                app.installDiscordBot(discordClient);
            }

            mainLog("Application is now online!");
            return;
        } catch (err) {
            errorLog(err);
            process.exit(1);
        }
    }

    if (args.has("deployCommands")) {
        args.delete("deployCommands");
        if (!config.discord.useDiscord) {
            errorLog("In the config Discord-Credentials are not specified");
            process.exit(1);
        }
        await deployCommands(config);
    }

    if (args.has("bot")) {
        args.delete("bot");
        if (!config.discord.useDiscord) {
            errorLog("In the config Discord-Credentials are not specified");
            process.exit(1);
        }
        try {
            mainLog("Starting to launch the Discord Bot!");
            const discordClient = createDiscordBot(app);
            await discordClient.login(config.discord.botToken);
            app.installDiscordBot(discordClient);
        } catch (err) {
            errorLog(err);
            process.exit(1);
        }
    }

    if (args.has("api")) {
        args.delete("api");
        try {
            mainLog("Starting to launch the API!");
            const fastify = createFastifyApi(app);
            await fastify.listen({ port: config.api.port, host: "0.0.0.0" });
            apiLog(`Api is started on Port ${config.api.port}`);
        } catch (err) {
            errorLog(err);
            process.exit(1);
        }
    }

    if (args.has("app")) {
        args.delete("app");
        mainLog("Starting the Main Application!");
        await app.start();
        appLog("App is now running!");
    }

    mainLog(`The following args could not be interprated: ${[...args.keys()].join(", ")}`);
}

main();
