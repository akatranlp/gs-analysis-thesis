import fs from "fs/promises";
import { Application, configParser } from "./application";
import { runApi } from "./api";
import { createDiscordBot } from "./discordBot";

const main = async () => {
    const exampleConfig = await configParser.parseAsync(JSON.parse(await fs.readFile("./config.json", "utf8")));
    const app = new Application(exampleConfig);
    await app.run();
    await runApi(app);
    await createDiscordBot(app);
};

main();
