/*****************************
 * Signal K Client
 *****************************/

export * from "./signalk-client.ts";
export * from "./utils.ts";
export * from "./stream-api.ts";
export * from "./http-api.ts";
export * from "./apps-api.ts";

let _isDev = false;

export function setDev(val?: boolean) {
  _isDev = val ? true : false;
}

export function debug(...args: any[]) {
  if (_isDev) {
    console.log(`** debug: `, ...args);
  }
}
