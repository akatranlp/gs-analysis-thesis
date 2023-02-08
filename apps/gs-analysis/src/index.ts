import { Application } from "./application";
import { createFastifyApi } from "./api";
import { createDiscordBot, deployCommands } from "./discord";
import { loadAndParseConfig } from "./config";

const main = async () => {
    const config = await loadAndParseConfig("./config.json");

    const app = new Application(config);

    if (process.argv.length > 3) {
        console.error("false number of args!");
        process.exit(1);
    }

    if (process.argv.length < 3) {
        try {
            console.log("Starting to launch entire Application!");
            await app.start();
            console.log("App is running!");

            const fastify = createFastifyApi(app);
            await fastify.listen({ port: config.apiPort, host: "0.0.0.0" });
            console.log(`Api is started on Port ${config.apiPort}`);

            const discordClient = createDiscordBot(app);
            await discordClient.login(config.discord.botToken);
            console.log("Application is now online!");
            return;
        } catch (err) {
            console.log(err);
            process.exit(1);
        }
    }

    if (process.argv[2] === "deployCommands") {
        return deployCommands(config);
    }
    if (process.argv[2] === "api") {
        try {
            console.log("Starting to launch only the API!");
            const fastify = createFastifyApi(app);
            await fastify.listen({ port: config.apiPort, host: "0.0.0.0" });
            console.log(`Api is started on Port ${config.apiPort}`);
            return;
        } catch (err) {
            console.log(err);
            process.exit(1);
        }
    } else if (process.argv[2] === "bot") {
        try {
            console.log("Starting to launch only the Discord Bot!");
            const discordClient = createDiscordBot(app);
            await discordClient.login(config.discord.botToken);
            return;
        } catch (err) {
            console.log(err);
            process.exit(1);
        }
    } else if (process.argv[2] === "app") {
        console.log("Starting to launch only the Main Application!");
        await app.start();
        console.log("App is now running!");
        return;
    } else {
        console.error("input is wrong");
        process.exit(1);
    }
}

main();
