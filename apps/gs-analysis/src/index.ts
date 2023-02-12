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
    const config = await loadAndParseConfig("./config.json");

    const app = new Application(config);

    if (process.argv.length > 3) {
        console.error("false number of args!");
        process.exit(1);
    }
    if (process.argv.length < 3) {
        try {
            mainLog("Starting to launch entire Application!");
            await app.start();
            appLog("App is running!");

            const fastify = createFastifyApi(app);
            await fastify.listen({ port: config.apiPort, host: "0.0.0.0" });
            apiLog(`Api is started on Port ${config.apiPort}`);

            const discordClient = createDiscordBot(app);
            await discordClient.login(config.discord.botToken);
            mainLog("Application is now online!");

            app.installDiscordBot(discordClient);
            return;
        } catch (err) {
            errorLog(err);
            process.exit(1);
        }
    }

    if (process.argv[2] === "deployCommands") {
        await deployCommands(config);
    } else if (process.argv[2] === "api") {
        try {
            mainLog("Starting to launch only the API!");
            const fastify = createFastifyApi(app);
            await fastify.listen({ port: config.apiPort, host: "0.0.0.0" });
            apiLog(`Api is started on Port ${config.apiPort}`);
        } catch (err) {
            errorLog(err);
            process.exit(1);
        }
    } else if (process.argv[2] === "bot") {
        try {
            mainLog("Starting to launch only the Discord Bot!");
            const discordClient = createDiscordBot(app);
            await discordClient.login(config.discord.botToken);

            app.installDiscordBot(discordClient);
        } catch (err) {
            errorLog(err);
            process.exit(1);
        }
    } else if (process.argv[2] === "app") {
        mainLog("Starting to launch only the Main Application!");
        await app.start();
        appLog("App is now running!");
    } else {
        errorLog("input is wrong");
        process.exit(1);
    }
}

main();
