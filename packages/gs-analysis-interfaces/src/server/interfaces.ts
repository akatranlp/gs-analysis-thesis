import { Client, ConnectConfig } from "ssh2";
import http from "http";
import { z } from "zod";

export interface StatusInfo {
    isOnline: boolean
    isInactive: boolean
    name: string,
    type: "hw" | "vm" | "gs"
    playerCount: number | null
    maxPlayers: number | null
    rcon: boolean | null
    childrenInfo: StatusInfo[] | null
    shutdownedServers: string[]
}

export const serverInfoValidator = z
    .object({
        name: z.string(),
        type: z.enum(["hw", "vm", "gs"]),
    }).passthrough();

export type ServerInfo = z.infer<typeof serverInfoValidator>;
export interface Server {
    info: ServerInfo
}

export const createDockerAgent = (sshOptions: ConnectConfig) => {
    const conn = new Client();
    const agent = new http.Agent();

    (agent as http.Agent & { createConnection: (options: any, fn: (err: Error | undefined, stream: any) => void) => void })
        .createConnection = (options, fn) => {

            const timeOutCallback = () => {
                conn.end();
                agent.destroy();
            }

            const errorCallback = (err: Error) => {
                console.error(err);
                conn.end();
                agent.destroy();
            }

            conn.once('ready', () => {
                conn.exec('docker system dial-stdio', (err, stream) => {
                    if (err) {
                        conn.end();
                        agent.destroy();
                    }

                    fn(err, stream);

                    stream.once('close', () => {
                        conn.end();
                        agent.destroy();
                    });
                });
            })
                .once("timeout", timeOutCallback)
                .once("error", errorCallback)
                .connect(sshOptions);

            conn.once('end', () => {
                agent.destroy();
                conn.removeListener("timeout", timeOutCallback);
                conn.removeListener("error", errorCallback);
            });
        };
    return agent;
}
