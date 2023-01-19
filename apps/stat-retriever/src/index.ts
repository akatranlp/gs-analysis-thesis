import { Application } from "./Application";
import { getConfig } from "./Config";

const main = async () => {
    const config = await getConfig(process.env.CONFIG_FILE || "config.json");
    const app = new Application(config);
    await app.loop();
}

main()
