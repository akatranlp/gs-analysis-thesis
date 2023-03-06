import dgram from "dgram";
import net from "net";
import { createLogger } from "logger";

interface ProxyOptions {
    name: string
    port: number
    serverAddress: string
    serverPort: number
}

export const createUDPForwarder = ({ name, port, serverAddress, serverPort }: ProxyOptions) => {
    const log = createLogger(`UDPForward ${name}`);
    const activeConnections: Record<string, { socket: dgram.Socket, timeoutDate: Date } | undefined> = {};
    const socket = dgram.createSocket({ type: "udp4" });

    socket.on("message", (data, remoteInfo) => {
        const key = `${remoteInfo.address}:${remoteInfo.port}`
        //log(remoteInfo, data.toString("utf-8"))
        if (!activeConnections[key]) {
            const innerSocket = dgram.createSocket({ type: "udp4" })
            innerSocket.on("message", (data) => {
                //log("inner", remoteInfo, data.toString("utf-8"))
                socket.send(data, remoteInfo.port, remoteInfo.address);
                activeConnections[key]!.timeoutDate = new Date();
            })
            activeConnections[key] = {
                socket: innerSocket,
                timeoutDate: new Date()
            }
        }

        activeConnections[key]!.socket.send(data, serverPort, serverAddress);
        activeConnections[key]!.timeoutDate = new Date();
    });

    socket.bind(port, "0.0.0.0", () => {
        log(`from ${port} to ${serverAddress}:${serverPort}`);
    });

    setInterval(() => {
        const currentDate = new Date();
        Object.entries(activeConnections).filter(([_, data]) => Boolean(data)).forEach(([address, data]) => {
            if (currentDate.getTime() - data!.timeoutDate.getTime() >= 5000) {
                activeConnections[address]!.socket.close();
                activeConnections[address] = undefined;
            }
        });
    }, 1000);

    return {
        getConnectionCount: () => Object.values(activeConnections).filter(Boolean).length
    }
}

export const createTCPForwarder = ({ name, port, serverAddress, serverPort }: ProxyOptions) => {
    const log = createLogger(`TCPForward ${name}`);
    const activeConnections: Record<string, net.Socket | undefined> = {};
    const server = net.createServer((socket => {
        const key = `${socket.remoteAddress!}:${socket.remotePort!}`
        socket.on("data", (data) => {
            //log(socket.remotePort, socket.remoteAddress, data.toString("utf-8"));
            if (!activeConnections[key]) {
                const innerSocket = net.connect(serverPort, serverAddress);
                innerSocket.on("data", (data) => {
                    //log("inner", socket.remotePort, socket.remoteAddress, data.toString("utf-8"))
                    socket.write(data);
                }).on("close", () => {
                    if (!socket.closed) socket.end();
                })
                activeConnections[key] = innerSocket;
            }
            activeConnections[key]!.write(data);
        }).on("close", () => {
            if (activeConnections[key] && !activeConnections[key]!.closed) {
                activeConnections[key]!.end();
            }
            activeConnections[key] = undefined;
        })
    }));

    server.listen(port, "0.0.0.0", () => {
        log(`from ${port} to ${serverAddress}:${serverPort}`);
    });

    return {
        getConnectionCount: () => Object.values(activeConnections).filter(Boolean).length
    }
}