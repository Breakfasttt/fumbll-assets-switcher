import type { FumbblApi } from "../main/preload";

declare global {
  interface Window {
    fumbblApi: FumbblApi;
  }
}

export {};
