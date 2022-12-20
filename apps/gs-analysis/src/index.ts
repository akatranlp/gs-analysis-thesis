import { log } from "logger";
import fs from "fs/promises";
import {
    serverInfoValidator,
    hostServerInfoValidator,
    vmServerInfoValidator,
    gameServerInfoValidator,
    ServerInfo,
} from "gs-analysis-interfaces";
import { z } from "zod";

const configParser = z.object({
    servers: z.array(serverInfoValidator)
});

const parseConfig = async (config: ServerInfo) => {
    let secondStep;
    switch (config.type) {
        case "hw":
            secondStep = await hostServerInfoValidator.parseAsync(config);
            break;
        case "vm":
            secondStep = await vmServerInfoValidator.parseAsync(config);
            break;
        case "gs":
            secondStep = await gameServerInfoValidator.parseAsync(config);
            break;
    }
    log(secondStep);
}

const main = async () => {
    const exampleConfig = await configParser.parseAsync(JSON.parse(await fs.readFile("./config.json", "utf8")));
    if (exampleConfig.servers) {
        exampleConfig.servers.forEach(parseConfig)
    }
};

main();
