import dgram from "dgram";
import net from "net";
import { createLogger } from "logger";

const udpLog = createLogger("UDPProxy");
const tcpLog = createLogger("TCPProxy");

export const createUDPForwarder = ({ port, serverPort, serverAdress }
    : { port: number, serverPort: number, serverAdress: string }) => {
    const activeConnections: Record<string, { socket: dgram.Socket, timeoutDate: Date } | undefined> = {};
    const socket = dgram.createSocket({ type: "udp4" });

    socket.on("message", (data, remoteInfo) => {
        const key = `${remoteInfo.address}:${remoteInfo.port}`
        //udpLog(remoteInfo, data.toString("utf-8"))
        if (!activeConnections[key]) {
            const innerSocket = dgram.createSocket({ type: "udp4" })
            innerSocket.on("message", (data) => {
                // udpLog("inner", remoteInfo, data.toString("utf-8"))
                socket.send(data, remoteInfo.port, remoteInfo.address);
                activeConnections[key]!.timeoutDate = new Date();
            })
            activeConnections[key] = {
                socket: innerSocket,
                timeoutDate: new Date()
            }
        }

        activeConnections[key]!.socket.send(data, serverPort, serverAdress);
        activeConnections[key]!.timeoutDate = new Date();
    });

    socket.bind(port, "0.0.0.0", () => {
        udpLog(`Listen on port ${port}`)
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

    return () => Object.values(activeConnections).filter(Boolean).length
}

export const createTCPForwarder = ({ port, serverPort, serverAdress }
    : { port: number, serverPort: number, serverAdress: string }) => {
    const activeConnections: Record<string, net.Socket | undefined> = {};
    const server = net.createServer((socket => {
        const key = `${socket.remoteAddress!}:${socket.remotePort!}`
        socket.on("data", (data) => {
            //tcpLog(socket.remotePort, socket.remoteAddress, data.toString("utf-8"));
            if (!activeConnections[key]) {
                const innerSocket = net.connect(serverPort, serverAdress);
                innerSocket.on("data", (data) => {
                    //tcpLog("inner", socket.remotePort, socket.remoteAddress, data.toString("utf-8"))
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
        tcpLog(`Server is listening on port ${port}`)
    })

    return () => Object.values(activeConnections).filter(Boolean).length
}