import fs from "fs/promises";
import { Application, configParser } from "./application";

const main = async () => {
    const exampleConfig = await configParser.parseAsync(JSON.parse(await fs.readFile("./config.json", "utf8")));
    const app = new Application(exampleConfig);
    await app.run();
};

main();
