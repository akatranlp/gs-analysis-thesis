import { Application } from "./application";
import { z } from "zod";
import Fastify, { FastifyInstance, FastifyRequest } from "fastify";
import FastifyStatic from "@fastify/static";
import path from "path";
import { RconGameServer } from "gs-analysis-interfaces";
import { configParser } from "./config";
import { createLogger } from "logger";

const apiLog = createLogger("API");

const wrapZodError = async <T>(callback: () => Promise<T>) => {
    try {
        return await callback()
    } catch (err) {
        if (err instanceof z.ZodError) throw new Error(JSON.stringify(err.format()));
        throw err;
    }
}

const statusRouter = (fastify: FastifyInstance, app: Application) => {
    fastify.get("/api/servers", async () => ({
        lastStatusUpdate: app.lastStatusUpdate,
        statusGraph: await app.getServerStatusInfo(false, null),
        shutdownedServers: app.shutdownedServers,
    }));

    const inputSchema = z.object({ servername: z.string() });
    type CustomRequest = FastifyRequest<{ Params: z.infer<typeof inputSchema> }>

    fastify.get("/api/servers/:servername", async (req: CustomRequest, res) => {
        return (await app.getServerStatusInfo(false, req.params.servername))[0];
    });
}

const configUpdateRouter = (fastify: FastifyInstance, app: Application) => {
    const inputSchema = configParser.shape.app.removeDefault().pick({
        timeout: true,
        interval: true,
        stopIfNeeded: true
    }).partial().strict();

    type CustomRequest = FastifyRequest<{ Body: z.infer<typeof inputSchema> }>

    fastify.put("/api/config", async (req: CustomRequest, res) => (
        wrapZodError(async () => {
            const body = await inputSchema.parseAsync(req.body);
            if (body.interval) app.config.app.interval = body.interval
            if (body.timeout) app.config.app.timeout = body.timeout
            if (body.stopIfNeeded) app.config.app.stopIfNeeded = body.stopIfNeeded
            return true;
        })
    ));
}

const rconCommandRouter = (fastify: FastifyInstance, app: Application) => {
    const inputSchema = z.object({ servername: z.string() });
    const bodySchema = z.object({ command: z.string() });
    type CustomRequest = FastifyRequest<{ Params: z.infer<typeof inputSchema>, Body: z.infer<typeof bodySchema> }>

    fastify.post("/api/servers/:servername/rcon", async (req: CustomRequest, res) => (
        wrapZodError(async () => {
            const body = await bodySchema.parseAsync(req.body);
            if (!(req.params.servername in app.gsServers)) throw new Error("Server not configured!");
            const server = app.gsServers[req.params.servername];
            if (!(server instanceof RconGameServer)) throw new Error("Server has no RCON");
            apiLog("Requested the command", body.command, "on the server", server.info.name);
            const result = await server.sendCommand(body.command);
            return { result }
        })
    ));
}

const startStopServerRouter = (fastify: FastifyInstance, app: Application) => {
    const inputSchema = z.object({ servername: z.string() });
    const bodySchema = z.object({ state: z.enum(["stopin"]) });
    type CustomRequest = FastifyRequest<{ Params: z.infer<typeof inputSchema>, Body: z.infer<typeof bodySchema> }>

    fastify.put("/api/servers", async (req: CustomRequest, res) => (
        wrapZodError(async () => {
            const body = await bodySchema.parseAsync(req.body);
            if (body.state === "stopin") {
                apiLog("Requested stop if needed!")
                return await app.stopServersIfNeeded(null, 0);
            }
        })
    ));

    const bodySchemaServers = z.object({ state: z.enum(["start", "stop", "stopin"]) });
    type CustomRequestServers = FastifyRequest<{ Params: z.infer<typeof inputSchema>, Body: z.infer<typeof bodySchemaServers> }>

    fastify.put("/api/servers/:servername", async (req: CustomRequestServers, res) => (
        wrapZodError(async () => {
            const body = await bodySchemaServers.parseAsync(req.body);
            if (body.state === "start") {
                apiLog("start", req.params.servername);
                return await app.startServer(req.params.servername);
            } else if (body.state === "stop") {
                apiLog("stop", req.params.servername);
                return await app.stopServer(req.params.servername);
            } else if (body.state === "stopin") {
                apiLog("stop-if-needed", req.params.servername);
                return (await app.stopServersIfNeeded(req.params.servername, 0))[0]
            }
        })
    ))
}

export const createFastifyApi = (app: Application) => {
    const fastify = Fastify({ logger: false });

    fastify.register(FastifyStatic, {
        root: path.join(__dirname, "public")
    });

    fastify.get("/api", async () => {
        return { hello: "world" }
    });

    statusRouter(fastify, app);
    rconCommandRouter(fastify, app);
    configUpdateRouter(fastify, app);
    startStopServerRouter(fastify, app);

    return fastify;
}