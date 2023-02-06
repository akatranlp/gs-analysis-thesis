import { HostServer } from "gs-analysis-interfaces";

interface HWPlugin {
  server: typeof HostServer;
}

interface GSPlugin {
  server: typeof HostServer;
  validator: {};
}

interface LoadPluginInput {
  type: "hw" | "gs";
  subType: string;
}

export class PluginLoader {
  hwPlugins: HWPlugin[] = [];
  gsPlugins: GSPlugin[] = [];

  async loadPlugins(input: LoadPluginInput[]) {
    await Promise.all(input.map((i) => this.loadPlugin(i)));
  }

  async loadPlugin({ type, subType }: LoadPluginInput) {
    const module = await import(`gs-analysis-${type}-${subType}`);
    if (type == "hw") {
    } else {
    }
  }
}
