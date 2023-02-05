import net from "net";

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

export class RconClient {
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

        this.socket
          .once("connect", async () => {
            await this.write(this.createRCONMessageBuffer({ id: 0, type: 3, body: this.password }));
          })
          .once("data", (data: Buffer) => {
            const response = this.readRCONMessageBuffer(data);
            this.socket?.removeListener("error", errorCallback);
            if (response.id === -1) {
              reject(new Error("Auth Failed"));
            } else {
              resolve()
            }
          })
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
        const response = this.readRCONMessageBuffer(data);
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

      this.write(this.createRCONMessageBuffer({ id: 420, type: 2, body: command }));
      this.write(this.createRCONMessageBuffer({ id: 1337, type: 0, body: "" }));
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
          const response = this.readRCONMessageBuffer(data);
          this.socket?.removeListener("error", errorCallback);
          this.data = "";
          resolve(response.body);
        })
        .once("error", errorCallback);

      this.write(this.createRCONMessageBuffer({ id: 420, type: 2, body: command }));
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

  createRCONMessageBuffer({ id, type, body }: RCONPacket): Buffer {
    const messageSize = Buffer.byteLength(body) + 14;
    const buffer = Buffer.alloc(messageSize);
    buffer.writeInt32LE(messageSize - 4, 0);
    buffer.writeInt32LE(id, 4);
    buffer.writeInt32LE(type, 8);
    buffer.write(body, 12, "ascii");
    buffer.writeInt16LE(0, messageSize - 2);
    return buffer;
  }

  readRCONMessageBuffer(buffer: Buffer): RCONPacket {
    return {
      id: buffer.readInt32LE(4),
      type: buffer.readInt32LE(8),
      body: buffer.toString("ascii", 12, buffer.length - 2)
    }
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
      }
    })
  }
}
