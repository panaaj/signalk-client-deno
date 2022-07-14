/*****************************
 * Signal K Client
 *****************************/

export * from "./signalk-client.ts";
export * from "./utils.ts";
export * from "./stream-api.ts";
export * from "./http-api.ts";
export * from "./apps-api.ts";

let _isDev = false;

/** Sets development mode. */
export function setDev(val?: boolean) {
  _isDev = val ? true : false;
}

/** Print debug messages to console (if development mode) */
export function debug(...args: any[]) {
  if (_isDev) {
    console.log(`%cSignalKClient: `, "color: yellow", ...args);
  }
}
