import net from "net";

import { PromiseSocket } from "promise-socket";

interface RCONPacket {
  id: number,
  type: number,
  body: string
}

export interface RconClientOptions {
  host: string
  port: number
  password: string
}

const createRCONMessageBuffer = ({ id, type, body }: RCONPacket): Buffer => {
  const messageSize = Buffer.byteLength(body) + 14;
  const buffer = Buffer.alloc(messageSize);
  buffer.writeInt32LE(messageSize - 4, 0);
  buffer.writeInt32LE(id, 4);
  buffer.writeInt32LE(type, 8);
  buffer.write(body, 12, "ascii");
  buffer.writeInt16LE(0, messageSize - 2);
  return buffer;
}

const readRCONMessageBuffer = (buffer: Buffer): RCONPacket => {
  return {
    id: buffer.readInt32LE(4),
    type: buffer.readInt32LE(8),
    body: buffer.toString("ascii", 12, buffer.length - 2)
  }
}


export class RconClient {
  private socket = new PromiseSocket()
  private host: string
  private port: number
  private password: string
  private connected = false

  constructor({ host, port, password }: RconClientOptions) {
    this.host = host
    this.port = port
    this.password = password
  }

  async connect(): Promise<void> {
    await this.socket.connect(this.port, this.host);
    await this.socket.write(createRCONMessageBuffer({ id: 187, type: 3, body: this.password }));

    for await (const chunk of this.socket) {
      const response = readRCONMessageBuffer(chunk as Buffer);
      if (response.type == 2) {
        if (response.id === -1) {
          throw new Error("Auth failed");
        }
        this.connected = true;
        break;
      }
    }
  }

  async sendCommand(command: string): Promise<string> {
    if (!this.connected || this.socket.socket.closed) {
      throw new Error("socket not connected");
    }
    await this.socket.write(createRCONMessageBuffer({ id: 420, type: 2, body: command }));
    for await (const chunk of this.socket) {
      const response = readRCONMessageBuffer(chunk as Buffer);
      if (response.id === -1)
        throw new Error("Auth failed");
      return response.body
    }
    throw new Error("No Response")
  }

  async sendCommandWithLongResponse(command: string): Promise<string> {
    if (!this.connected || this.socket.socket.closed) {
      throw new Error("socket not connected");
    }
    await this.socket.write(createRCONMessageBuffer({ id: 420, type: 2, body: command }));
    await this.socket.write(createRCONMessageBuffer({ id: 1337, type: 2, body: "" }));

    let data = "";
    for await (const chunk of this.socket) {
      const response = readRCONMessageBuffer(chunk as Buffer);
      if (response.id === -1)
        throw new Error("Auth failed");
      else if (response.id === 420) {
        data += response.body
        continue
      }
      return data
    }
    throw new Error("No Response")
  }

  disconnect(): Promise<void> {
    this.connected = false;
    return this.socket.end();
  }

  isConnected() {
    return this.connected;
  }
}


export class OldRconClient {
  socket: net.Socket | null = null
  private data: string = ""
  private host: string
  private port: number
  private password: string

  constructor({ host, port, password }: RconClientOptions) {
    this.host = host
    this.port = port
    this.password = password
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        this.socket = net.createConnection({ host: this.host, port: this.port });

        const errorCallback = (err: Error) => {
          reject(err)
        }

        const dataCallback = (data: Buffer) => {
          const response = readRCONMessageBuffer(data);
          if (response.type == 2) {
            this.socket?.removeListener("error", errorCallback);
            this.socket?.removeListener("data", dataCallback);
            if (response.id === -1) {
              reject(new Error("Auth Failed"));
            } else {
              resolve()
            }
          }
        }

        this.socket
          .once("connect", async () => {
            await this.write(createRCONMessageBuffer({ id: 0, type: 3, body: this.password }));
          })
          .on("data", dataCallback)
          .on("close", (hadError: boolean) => {
            if (this.socket && this.socket.closed)
              this.socket = null
          })
          .once("error", errorCallback)
      }
    });
  }

  sendCommandWithLong(command: string): Promise<string> {
    return new Promise((resolve, reject) => {

      const errorCallback = (err: Error) => {
        reject(err)
      }

      const dataCallback = (data: Buffer) => {
        const response = readRCONMessageBuffer(data);
        if (response.id === 420) {
          this.data += response.body;
        } else if (response.id === 1337) {
          this.socket?.removeListener("data", dataCallback);
          this.socket?.removeListener("error", errorCallback);
          const res = this.data
          this.data = ""
          resolve(res)
        } else {
          this.socket?.removeListener("data", dataCallback);
          this.socket?.removeListener("error", errorCallback);
          reject(new Error("unknown error"));
        }
      }

      if (!this.isConnected())
        return reject(new Error("Socket not availlable"));

      this.socket!
        .on("data", dataCallback)
        .on("error", errorCallback);

      this.write(createRCONMessageBuffer({ id: 420, type: 2, body: command }));
      this.write(createRCONMessageBuffer({ id: 1337, type: 0, body: "" }));
    })
  }

  sendCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {

      const errorCallback = (err: Error) => {
        reject(err)
      }

      if (!this.isConnected())
        return reject(new Error("Socket not availlable"));

      this.socket!
        .once("data", (data: Buffer) => {
          const response = readRCONMessageBuffer(data);
          this.socket?.removeListener("error", errorCallback);
          this.data = "";
          resolve(response.body);
        })
        .once("error", errorCallback);

      this.write(createRCONMessageBuffer({ id: 420, type: 2, body: command }));
    })
  }

  write(buffer: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket)
        return reject(new Error("Socket not availlable"));
      this.socket.write(buffer, (err) => {
        if (err)
          reject(err)
        else
          resolve()
      })
    });
  }

  isConnected() {
    return !!this.socket && !this.socket.closed
  }

  disconnect(): Promise<void> {
    return new Promise(resolve => {
      if (this.isConnected()) {
        this.socket!.on("end", () => {
          resolve();
        });
        this.socket!.end();
      } else {
        resolve();
      }
    })
  }
}
