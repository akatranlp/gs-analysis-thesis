import { NodeSSH } from "node-ssh";
import { delay } from "utils";

export class SSHClient {
  private client = new NodeSSH();
  constructor(private sshOptions: any, private serverOptions: { port: number }) { }

  connect() {
    return this.client.connect(this.sshOptions);
  }

  disconnect() {
    this.client.dispose();
  }

  isConnected() {
    return this.client.isConnected();
  }

  async getPlayerCount(): Promise<number> {
    this.client.execCommand(`sudo tcpdump -n -i enp3s0 port ${this.serverOptions.port} > /tmp/scan`);
    await delay(2000);

    await this.client.execCommand("sudo kill `pidof tcpdump`");
    const response = await this.client.execCommand("cat /tmp/scan");

    const rawData = response.stdout
    this.client.dispose();
    const data = rawData.split("\n").map(str => {
      const vec = str.split(" ");
      return [vec[2], vec[4], vec[5]];
    });
    const map: Record<string, [number, number]> = {}
    for (const row of data) {
      if (row[0] === `${this.sshOptions.host}.${this.serverOptions.port}`) {
        const entry = row[1].substring(0, row[1].length - 1)
        if (!map[entry]) {
          map[entry] = [0, 0];
        }
        map[entry][0] += 1
      } else {
        const entry = row[0]
        if (!map[entry]) {
          map[entry] = [0, 0];
        }
        map[entry][1] += 1
      }
    }
    console.log(map);
    return Object.values(map).filter(entry => entry[0] >= 5 && entry[1] >= 5).length;
  }
}
