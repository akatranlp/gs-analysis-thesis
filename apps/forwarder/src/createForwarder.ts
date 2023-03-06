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
        const clientAddress = `${remoteInfo.address}:${remoteInfo.port}`
        //log(remoteInfo, data.toString("utf-8"))
        if (!activeConnections[clientAddress]) {
            const innerSocket = dgram.createSocket({ type: "udp4" })
            innerSocket.on("message", (data) => {
                //log("inner", remoteInfo, data.toString("utf-8"))
                socket.send(data, remoteInfo.port, remoteInfo.address);
                activeConnections[clientAddress]!.timeoutDate = new Date();
            })
            activeConnections[clientAddress] = {
                socket: innerSocket,
                timeoutDate: new Date()
            }
        }

        activeConnections[clientAddress]!.socket.send(data, serverPort, serverAddress);
        activeConnections[clientAddress]!.timeoutDate = new Date();
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
        const clientAddress = `${socket.remoteAddress!}:${socket.remotePort!}`
        socket.on("data", (data) => {
            //log(socket.remotePort, socket.remoteAddress, data.toString("utf-8"));
            if (!activeConnections[clientAddress]) {
                const innerSocket = net.connect(serverPort, serverAddress);
                innerSocket.on("data", (data) => {
                    //log("inner", socket.remotePort, socket.remoteAddress, data.toString("utf-8"))
                    socket.write(data);
                }).on("close", () => {
                    if (!socket.closed) socket.end();
                })
                activeConnections[clientAddress] = innerSocket;
            }
            activeConnections[clientAddress]!.write(data);
        }).on("close", () => {
            if (activeConnections[clientAddress] && !activeConnections[clientAddress]!.closed) {
                activeConnections[clientAddress]!.end();
            }
            activeConnections[clientAddress] = undefined;
        })
    }));

    server.listen(port, "0.0.0.0", () => {
        log(`from ${port} to ${serverAddress}:${serverPort}`);
    });

    return {
        getConnectionCount: () => Object.values(activeConnections).filter(Boolean).length
    }
}