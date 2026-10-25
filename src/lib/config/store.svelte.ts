import { invoke } from "@tauri-apps/api/core";
import type { AppConfig } from "./types";

class ConfigStore {
  config: AppConfig | null = $state(null);

  async init() {
    this.config = await invoke<AppConfig>("get_config");
  }

  async save(config: AppConfig) {
    await invoke("save_config_cmd", { config });
    this.config = config;
  }
}

export const configStore = new ConfigStore();
