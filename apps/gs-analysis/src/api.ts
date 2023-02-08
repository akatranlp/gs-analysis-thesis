import { Application, configParser } from "./application"
import { z } from "zod";
import Fastify, { FastifyInstance, FastifyRequest } from "fastify";
import FastifyStatic from "@fastify/static";
import path from "path";
import { GameServer, HostServer, RconGameServer } from "gs-analysis-interfaces";

const wrapZodError = async <T>(callback: () => Promise<T>) => {
    try {
        return await callback()
    } catch (err) {
        if (err instanceof z.ZodError) throw new Error(JSON.stringify(err.format()));
        throw err;
    }
}

const statusRouter = (app: Application, fastify: FastifyInstance) => {
    fastify.get("/api/servers", async () => {
        return {
            lastStatusUpdate: app.lastStatusUpdate,
            statusGraph: app.statusGraph
        };
    });

    const inputSchema = z.object({ servername: z.string() });
    type CustomRequest = FastifyRequest<{ Params: z.infer<typeof inputSchema> }>

    fastify.get("/api/servers/:servername", async (req: CustomRequest, res) => {
        let server: HostServer | GameServer | undefined;
        if (req.params.servername in app.rootServers) server = app.rootServers[req.params.servername];
        if (req.params.servername in app.hwServers) server = app.hwServers[req.params.servername];
        if (req.params.servername in app.gsServers) server = app.gsServers[req.params.servername];
        if (!server) throw new Error("Server not configured!");

        return server.statusInfo(null, app.config.timeout);
    });
}

const configUpdateRouter = (app: Application, fastify: FastifyInstance) => {
    const inputSchema = configParser.pick({
        timeout: true,
        interval: true
    }).partial().strict();

    type CustomRequest = FastifyRequest<{ Body: z.infer<typeof inputSchema> }>

    fastify.put("/api/config", async (req: CustomRequest, res) => (
        wrapZodError(async () => {
            const body = await inputSchema.parseAsync(req.body);
            if (body.interval) app.config.interval = body.interval
            if (body.timeout) app.config.timeout = body.timeout
            return {};
        })
    ));
}

const rconCommandRouter = (app: Application, fastify: FastifyInstance) => {
    const inputSchema = z.object({ servername: z.string() });
    const bodySchema = z.object({ command: z.string() });
    type CustomRequest = FastifyRequest<{ Params: z.infer<typeof inputSchema>, Body: z.infer<typeof bodySchema> }>

    fastify.post("/api/servers/:servername/rcon", async (req: CustomRequest, res) => (
        wrapZodError(async () => {
            const body = await bodySchema.parseAsync(req.body);
            if (!(req.params.servername in app.gsServers)) throw new Error("Server not configured!");
            const server = app.gsServers[req.params.servername];
            if (!(server instanceof RconGameServer)) throw new Error("Server has no RCON");
            const result = await server.sendCommand(body.command);
            return { result }
        })
    ));
}

const startStopServerRouter = (app: Application, fastify: FastifyInstance) => {
    const inputSchema = z.object({ servername: z.string() });
    const bodySchema = z.object({ state: z.enum(["start", "stop", "stopin"]) });
    type CustomRequest = FastifyRequest<{ Params: z.infer<typeof inputSchema>, Body: z.infer<typeof bodySchema> }>

    fastify.put("/api/servers", async (req: CustomRequest, res) => (
        wrapZodError(async () => {
            const body = await bodySchema.parseAsync(req.body);
            if (body.state === "start") {
                throw new Error("not implemented");
            } else if (body.state === "stop") {
                throw new Error("not implemented");
            } else if (body.state === "stopin") {
                return await app.stopServersIfNeeded(undefined, 0);
            }
        })
    ));

    fastify.put("/api/servers/:servername", async (req: CustomRequest, res) => (
        wrapZodError(async () => {
            const body = await bodySchema.parseAsync(req.body);
            if (body.state === "start") {
                throw new Error("not implemented");
            } else if (body.state === "stop") {
                throw new Error("not implemented");
            } else if (body.state === "stopin") {
                return await app.stopServersIfNeeded(req.params.servername, 0);
            }
        })
    ))
}

export const runApi = async (app: Application) => {
    const fastify = Fastify({ logger: true });

    fastify.register(FastifyStatic, {
        root: path.join(__dirname, "public")
    });

    fastify.get("/api", async () => {
        return { hello: "world" }
    });

    statusRouter(app, fastify);
    rconCommandRouter(app, fastify);
    configUpdateRouter(app, fastify);
    startStopServerRouter(app, fastify);

    try {
        await fastify.listen({ port: app.config.apiPort, host: "0.0.0.0" });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}