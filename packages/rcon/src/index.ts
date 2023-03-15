import net from "net";
import PromiseSocket from "promise-socket"

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


// This function is based on the nodejs-implementation from Speedhaxx
// https://developer.valvesoftware.com/wiki/Source_RCON_Protocol#Node.js
export const createRCONMessageBuffer = ({ id, type, body }: RCONPacket): Buffer => {
  const messageSize = Buffer.byteLength(body) + 14;
  const buffer = Buffer.alloc(messageSize);
  buffer.writeInt32LE(messageSize - 4, 0);
  buffer.writeInt32LE(id, 4);
  buffer.writeInt32LE(type, 8);
  buffer.write(body, 12, "ascii");
  buffer.writeInt16LE(0, messageSize - 2);
  return buffer;
}

// This function is based on the nodejs-implementation from Speedhaxx
// https://developer.valvesoftware.com/wiki/Source_RCON_Protocol#Node.js
export const readRCONMessageBuffer = (buffer: Buffer): RCONPacket => {
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

  async disconnect(): Promise<void> {
    if (this.isConnected()) {
      this.connected = false;
      return this.socket.end();
    }
  }

  isConnected() {
    return this.connected;
  }
}
