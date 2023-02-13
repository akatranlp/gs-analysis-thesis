import { NodeSSH } from "node-ssh";

export class SSHClient {
  private client = new NodeSSH();
  constructor(private sshOptions: any, private serverOptions: { port: number, interface: string }) { }

  connect() {
    return this.client.connect(this.sshOptions);
  }

  async disconnect() {
    if (!this.isConnected()) return this.client.dispose();
    await this.client.execCommand("sudo kill `pidof tcpdump`");
    await this.client.execCommand(`rm /tmp/${this.serverOptions.port}`);
    this.client.dispose();
  }

  isConnected() {
    return this.client.isConnected();
  }

  async getPlayerCount(): Promise<number> {
    await this.client.execCommand("sudo kill `pidof tcpdump`");
    const response = await this.client.execCommand(`touch /tmp/${this.serverOptions.port} && cat /tmp/${this.serverOptions.port}`);

    // UDP Packets:
    // 15:54:39.176060 IP 192.168.10.54.27015 > 192.168.20.10.27005: UDP, length 56
    // 15:54:39.184395 IP 192.168.20.10.27005 > 192.168.10.54.27015: UDP, length 48

    // TCP Packets:
    // 15:44:18.607622 IP 192.168.10.54.25565 > 192.168.20.10.56630: Flags [P.], seq 97377:97389, ack 460, win 501, length 12
    // 15:44:18.607638 IP 192.168.20.10.56630 > 192.168.10.54.25565: Flags [.], ack 97335, win 1025, length 0

    const rawData = response.stdout;

    const data = rawData.split("\n").map(str => {
      const vec = str.split(" ");
      if (vec.length < 5) return { from: "", to: "" }
      return { from: vec[2], to: vec[4].slice(0, -1) }
    });

    const map: Record<string, { serverPacketNumber: number, clientPacketNumber: number }> = {}
    for (const { from, to } of data) {
      if (from === `${this.sshOptions.host}.${this.serverOptions.port}`) {
        if (!map[to]) {
          map[to] = { serverPacketNumber: 0, clientPacketNumber: 0 }
        }
        map[to].serverPacketNumber++;
      } else {
        if (!map[from]) {
          map[from] = { serverPacketNumber: 0, clientPacketNumber: 0 }
        }
        map[from].clientPacketNumber++;
      }
    }

    this.client.execCommand(`sudo tcpdump -n -i ${this.serverOptions.interface} port ${this.serverOptions.port} > /tmp/${this.serverOptions.port}`);
    return Object.values(map).filter(entry => entry.serverPacketNumber >= 5 && entry.clientPacketNumber >= 5).length;
  }
}
