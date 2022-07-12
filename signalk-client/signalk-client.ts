import { SignalKHttp } from "./http-api.ts";
import { SignalKStream } from "./stream-api.ts";
import { SignalKApps } from "./apps-api.ts";
import { Message, Path } from "./utils.ts";
import { debug } from "./mod.ts";

interface Server_Info {
  endpoints: { [key: string]: EndPoint };
  info: SKServer;
  apiVersions: Array<string>;
}

interface EndPoint {
  version: string;
  "signalk-http": string;
  "signalk-ws": string;
}

export interface SKServer {
  version: string;
  id: string;
}

interface HelloResponse {
  endpoints: { [key: string]: EndPoint };
  server: SKServer;
}

interface PlaybackOptions {
  startTime: string;
  playbackRate: number;
  subscribe: string | undefined;
}

interface JSON_Patch {
  op: "add" | "replace" | "remove" | "copy" | "move" | "test";
  path: string;
  value: unknown;
}

export enum APPDATA_CONTEXT {
  USER = "user",
  GLOBAL = "global",
}

/** Signal K Client class */
export class SignalKClient {
  private hostname = "localhost";
  private port = 3000;
  private protocol = "";

  private _version = "v1"; // ** default Signal K api version
  private _token = ""; // token for when security is enabled on the server

  /** endpoints to fallback to if hello response is not received.
   * @private
   */
  private fallbackEndpoints: HelloResponse = {
    endpoints: {
      v1: {
        version: "1.0.0",
        "signalk-http": "",
        "signalk-ws": "",
      },
    },
    server: { id: "fallback", version: "1.43.0" },
  };

  /** server information block
   * @property {Server_Info}
   */
  public server: Server_Info = {
    endpoints: {},
    info: {
      version: "",
      id: "",
    },
    apiVersions: [],
  };

  /** endpoints fallback to host address when no hello response
   * @property {boolean}
   */
  public fallback = false;

  /** endpoints are set to host address regardless of contents of hello response
   * @property {boolean}
   */
  public proxied = false;

  /** get preferred Signal K API version to use
   * @returns {number} Major version number of API. e.g. 1
   */
  get version(): number {
    return parseInt(this._version.slice(1));
  }

  /** set preferred Signal K API version to use
   * @param {number} val Major version number of API. e.g. 1
   */
  set version(val: number) {
    const v: string = "v" + val;
    if (this.server.apiVersions.length === 0) {
      this._version = v;
      debug(`Signal K api version set to: ${v}`);
    } else {
      this._version = this.server.apiVersions.includes(v) ? v : this._version;
      debug(
        `Signal K api version set request: ${v}, result: ${this._version}`,
      );
    }
    this.api.version = parseInt(v.slice(1));
    this.stream.version = parseInt(v.slice(1));
  }
  /** set auth token value
   * @param {string} val Token value
   */
  set authToken(val: string) {
    this._token = val;
    this.api.authToken = val;
    this.stream.authToken = val;
  }
  /** Get a Message object */
  get message(): Message {
    return Message;
  }

  /** generate and return a v4 UUID */
  get uuid(): string {
    return crypto.randomUUID(); //new UUID();
  }

  /** generate and return a Signal K UUID */
  get signalkUuid(): string {
    return `urn:mrn:signalk:uuid:${crypto.randomUUID()}`;
  }

  apps: SignalKApps;
  api: SignalKHttp;
  stream: SignalKStream;

  /** Create new Signal K Client */
  constructor() {
    this.apps = new SignalKApps();
    this.api = new SignalKHttp();
    this.stream = new SignalKStream();
    this.init();
  }

  /** initialise client protocol, hostname and port values.
   * @param {string} hostname Signal K server hostname / IP address
   * @param {number} port Port on which Signal K server is listening
   * @param {boolean} useSSL If true uses https / wss, if false uses http /ws
   */
  private init(
    hostname: string = this.hostname,
    port = 80,
    useSSL = false,
  ) {
    this.hostname = hostname ? hostname : this.hostname;
    if (useSSL) {
      this.protocol = "https";
      this.port = port || 443;
    } else {
      this.protocol = "http";
      this.port = port || 80;
    }
    const httpUrl = `${this.protocol}://${this.hostname}:${this.port}`;
    const wsUrl = `${useSSL ? "wss" : "ws"}://${this.hostname}:${this.port}`;
    this.fallbackEndpoints.endpoints.v1[
      "signalk-http"
    ] = `${httpUrl}/signalk/v1/api/`;
    this.fallbackEndpoints.endpoints.v1[
      "signalk-ws"
    ] = `${wsUrl}/signalk/v1/stream`;
  }

  // **************** CONNECTION AND DISCOVERY  ********************

  /** Signal K server endpoint discovery request (/signalk).
   * @param {string} hostname Signal K server hostname / IP address
   * @param {number} port Port on which Signal K server is listening
   * @param {boolean} useSSL If true uses https / wss, if false uses http /ws
   */
  hello(
    hostname: string = this.hostname,
    port = 3000,
    useSSL = false,
  ): Promise<{ [key: string]: unknown }> {
    this.init(hostname, port, useSSL);
    return this.get("/signalk");
  }

  /** connect to server (endpoint discovery) and DO NOT open Stream
   * @param {string} hostname Signal K server hostname / IP address
   * @param {number} port Port on which Signal K server is listening
   * @param {boolean} useSSL If true uses https / wss, if false uses http /ws
   */
  async connect(
    hostname: string = this.hostname,
    port = 3000,
    useSSL = false,
  ): Promise<boolean> {
    debug("Contacting Signal K server.........");
    try {
      const response: unknown = await this.hello(hostname, port, useSSL);
      // ** discover endpoints **
      this.getLoginStatus();
      if (this.stream) {
        this.stream.close();
      }
      this.processHello(response as HelloResponse);
      this.api.endpoint = this.resolveHttpEndpoint();
      this.stream.endpoint = this.resolveStreamEndpoint();
      return true;
    } catch (error) {
      if (this.fallback) {
        // fallback if no hello response
        if (this.stream) {
          this.stream.close();
        }
        this.processHello();
        this.api.endpoint = this.resolveHttpEndpoint();
        this.stream.endpoint = this.resolveStreamEndpoint();
        return true;
      } else {
        this.disconnectedFromServer();
        throw error;
      }
    }
  }

  /** Close all connections to Signal K server */
  disconnect() {
    this.stream.close();
  }

  /** Connect + open Delta Stream (endpoint discovery)
   * @param {string} hostname Signal K server hostname / IP address
   * @param {number} port Port on which Signal K server is listening
   * @param {boolean} useSSL If true uses https / wss, if false uses http /ws
   * @param {string} subscribe Subscription parameters for stream connection
   */
  connectStream(
    hostname: string = this.hostname,
    port = 3000,
    useSSL = false,
    subscribe = "",
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.connect(hostname, port, useSSL)
        .then(() => {
          // ** connect to stream api at preferred version else fall back to default version
          const url = this.resolveStreamEndpoint();
          if (!url) {
            reject(false);
            return;
          }
          this.stream.open(url, subscribe);
          resolve(true);
        })
        .catch((e) => {
          throw e;
        });
    });
  }

  /** connect to playback stream (endpoint discovery)
   * @param {string} hostname Signal K server hostname / IP address
   * @param {number} port Port on which Signal K server is listening
   * @param {boolean} useSSL If true uses https / wss, if false uses http /ws
   * @param {PlaybackOptions} options Options for playback stream connection
   */
  connectPlayback(
    hostname: string = this.hostname,
    port = 3000,
    useSSL = false,
    options: PlaybackOptions,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.connect(hostname, port, useSSL)
        .then(() => {
          // ** connect to playback api at preferred version else fall back to default version
          this.openPlayback("", options, this._token);
          resolve(true);
        })
        .catch((e) => {
          throw e;
        });
    });
  }

  /** connect to delta stream with (NO endpoint discovery)
   * @param {string} url Signal K stream endpoint url
   * @param {string} subscribe Subscription parameters for stream connection
   * @param {string} token Authentication token
   */
  openStream(
    url: string = this.hostname,
    subscribe?: string,
    token?: string,
  ): boolean {
    debug("openStream.........");
    if (!url) {
      // connect to stream api at discovered endpoint
      url = this.resolveStreamEndpoint();
      if (!url) {
        throw new Error("Server has no advertised Stream endpoints!");
      }
    }
    this.stream.open(url, subscribe, token);
    return true;
  }

  /** connect to playback stream (NO endpoint discovery)
   * @param {string} url Signal K stream endpoint url
   * @param {PlaybackOptions} options Options for playback stream connection
   * @param {string} token Authentication token
   */
  openPlayback(
    url: string = this.hostname,
    options?: PlaybackOptions,
    token?: string,
  ): boolean {
    debug("openPlayback.........");
    if (!url) {
      // connect to stream api at discovered endpoint
      url = this.resolveStreamEndpoint();
      if (!url) {
        throw new Error("Server has no advertised Stream endpoints!");
      }
      url = url.replace("stream", "playback");
    }
    let pb = "";
    let subscribe: string | undefined = "";
    if (options && typeof options === "object") {
      pb += options.startTime
        ? "?startTime=" +
          options.startTime.slice(0, options.startTime.indexOf(".")) +
          "Z"
        : "";
      pb += options.playbackRate ? `&playbackRate=${options.playbackRate}` : "";
      subscribe = options.subscribe ? options.subscribe : undefined;
    }
    this.stream.open(url + pb, subscribe, token);
    return true;
  }

  /** process Hello response
   * @private
   */
  private processHello(response?: HelloResponse) {
    if (this.proxied) {
      this.server.endpoints = this.fallbackEndpoints.endpoints;
    } else {
      this.server.endpoints = response && response["endpoints"]
        ? response["endpoints"]
        : this.fallbackEndpoints.endpoints;
    }
    this.server.info = response && response["server"]
      ? response["server"]
      : this.fallbackEndpoints.server;
    this.server.apiVersions = this.server.endpoints
      ? Object.keys(this.server.endpoints)
      : [];
    debug(this.server.endpoints);
    this.api.server = this.server.info;
    this.apps.endpoint = this.resolveAppsEndpoint();
  }

  /** return signalk apps API url
   * @private
   */
  private resolveAppsEndpoint(): string {
    return this.resolveHttpEndpoint().replace("api", "apps");
  }

  /** return preferred WS stream url */
  public resolveStreamEndpoint(): string {
    if (
      this.server.endpoints[this._version] &&
      this.server.endpoints[this._version]["signalk-ws"]
    ) {
      debug(`Connecting endpoint version: ${this._version}`);
      return `${this.server.endpoints[this._version]["signalk-ws"]}`;
    } else if (
      this.server.endpoints["v1"] &&
      this.server.endpoints["v1"]["signalk-ws"]
    ) {
      debug(`Connection falling back to: v1`);
      return `${this.server.endpoints["v1"]["signalk-ws"]}`;
    } else {
      return "";
    }
  }

  /** return signalk-http endpoint url
   * @private
   */
  private resolveHttpEndpoint(): string {
    let url = "";
    if (this.server.endpoints[this._version]) {
      // ** connection made
      // ** connect to http endpoint at prescribed version else fall back to default version
      if (this.server.endpoints[this._version]["signalk-http"]) {
        url = `${this.server.endpoints[this._version]["signalk-http"]}`;
      } else {
        url = `${this.server.endpoints["v1"]["signalk-http"]}`;
      }
    } else {
      const msg =
        "No current connection http endpoint service! Use connect() to establish a connection.";
      debug(msg);
    }
    return url;
  }

  /** cleanup on server disconnection
   * @private
   */
  private disconnectedFromServer() {
    this.server.endpoints = {};
    this.server.info = {
      version: "",
      id: "",
    };
    this.server.apiVersions = [];
  }

  /** HTTP GET from API path
   * @param {string} path Signal K path.
   * @returns {Promise<{[key: string]: unknown}>} JSON object
   */
  async get(path: string): Promise<{ [key: string]: unknown }> {
    if (path && path.length > 0 && path[0] == "/") {
      path = path.slice(1);
    }
    const url = `${this.protocol}://${this.hostname}:${this.port}/${
      Path.dotToSlash(path)
    }`;

    debug(`get ${url}`);
    const options: RequestInit = {};

    if (this._token) {
      options.headers = new Headers({ Authorization: `JWT ${this._token}` });
    }
    const response = await fetch(url, options);
    return response.json();
  }

  /** HTTP PUT to API path
   * @param {string} path Signal K path.
   * @param value Value to set
   * @returns {Promise<Response>}
   */
  async put(path: string, value: unknown): Promise<Response> {
    const url = `${this.protocol}://${this.hostname}:${this.port}/${
      Path.dotToSlash(path)
    }`;

    debug(`put ${url}`);
    const headers = new Headers({ "Content-Type": "application/json" });
    if (this._token) {
      headers.append("Authorization", `JWT ${this._token}`);
    }

    const options: RequestInit = {
      method: "PUT",
      headers: headers,
      body: JSON.stringify(value),
    };
    return await fetch(url, options);
  }

  /** HTTP POST to API path
   * @param {string} path Signal K path.
   * @param value Value to set
   * @returns {Promise<Response>}
   */
  async post(path: string, value: unknown): Promise<Response> {
    if (path && path.length > 0 && path[0] == "/") {
      path = path.slice(1);
    }
    const url = `${this.protocol}://${this.hostname}:${this.port}/${
      Path.dotToSlash(path)
    }`;

    debug(`post ${url}`);
    const headers = new Headers({ "Content-Type": "application/json" });
    if (this._token) {
      headers.append("Authorization", `JWT ${this._token}`);
    }

    const options: RequestInit = {
      method: "POST",
      headers: headers,
      body: JSON.stringify(value),
    };
    return await fetch(url, options);
  }

  /** get auth token for supplied user details */
  async login(
    username: string,
    password: string,
  ): Promise<{ ok: boolean; status: number; token: string }> {
    const headers = new Headers({ "Content-Type": "application/json" });
    const url =
      `${this.protocol}://${this.hostname}:${this.port}/signalk/${this._version}/auth/login`;

    debug(`post ${url}`);

    if (this._token) {
      headers.append("Authorization", `JWT ${this._token}`);
    }
    const options = {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ username: username, password: password }),
    };

    const response = await fetch(
      url,
      options,
    );

    const result = {
      ok: response.ok,
      status: response.status,
      token: "",
    };
    if (response.ok) {
      const cookies = response.headers.get("set-cookie")?.split(";");
      cookies?.forEach((c) => {
        if (c.indexOf("JAUTHENTICATION") !== -1) {
          this.authToken = c.split("=")[1];
          debug("authToken: ", this._token);
          result.token = this._token;
        }
      });
    }
    return result;
  }

  /** validate / refresh token from server */
  async validate(): Promise<{ ok: boolean; status: number; token: string }> {
    const url =
      `${this.protocol}://${this.hostname}:${this.port}/signalk/${this._version}/auth/validate`;

    debug(`post ${url}`);
    const headers = new Headers({ "Content-Type": "application/json" });
    if (this._token) {
      headers.append("Authorization", `JWT ${this._token}`);
    }

    const options = {
      method: "POST",
      headers: headers,
      body: null,
    };

    const response: Response = await fetch(url, options);

    const result = {
      ok: response.ok,
      status: response.status,
      token: "",
    };
    if (response.ok) {
      const cookies = response.headers.get("set-cookie")?.split(";");
      cookies?.forEach((c) => {
        if (c.indexOf("JAUTHENTICATION") !== -1) {
          this.authToken = c.split("=")[1];
          debug("authToken: ", this._token);
          result.token = this._token;
        }
      });
    }
    return result;
  }

  /** logout from server */
  logout(): Promise<boolean> {
    const url =
      `${this.protocol}://${this.hostname}:${this.port}/signalk/${this._version}/auth/logout`;

    debug(`post ${url}`);
    const headers = new Headers({ "Content-Type": "application/json" });
    if (this._token) {
      headers.append("Authorization", `JWT ${this._token}`);
    }

    const options = {
      method: "POST",
      headers: headers,
      body: null,
    };

    try {
      fetch(url, options);
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }

  /** Tests if a user authenticated to the server
   * @returns {boolean} true if user is logged in.
   */
  async isLoggedIn(): Promise<boolean> {
    const response = await this.getLoginStatus();
    return response.status === "loggedIn" ? true : false;
  }

  /** fetch Signal K login status from server */
  getLoginStatus(): Promise<{ [key: string]: unknown }> {
    let url = `/skServer/loginStatus`;
    if (this.server && this.server.info.id === "signalk-server-node") {
      const ver = this.server.info["version"].split(".");
      url = ver[0] === "1" && parseInt(ver[1]) < 36 //use legacy link for older versions
        ? `/loginstatus`
        : url;
    }
    return this.get(url);
  }

  /** get data via the snapshot http api path for supplied time */
  snapshot(context: string, time: string): Promise<{ [key: string]: unknown }> {
    if (!time) {
      throw new Error("Error: No time value supplied!");
    }
    time = time.slice(0, time.indexOf(".")) + "Z";
    let url = this.resolveHttpEndpoint();
    if (!url) {
      throw new Error("Error: Unable to resolve URL!");
    }
    url = `${url.replace("api", "snapshot")}${
      Path.contextToPath(
        context,
      )
    }?time=${time}`;

    return this.get(url);
  }

  /*******************************
   *  applicationData api methods
   * context: 'user' or 'global'
   * appId: application id string
   *******************************/
  private _appId = "";
  private _appVersion = "";

  private resolveAppDataEndpoint(
    context: APPDATA_CONTEXT,
    appId: string,
  ): string {
    if (!context || !appId) {
      return "";
    }
    const url = this.resolveHttpEndpoint().replace("api", "applicationData");
    return `${url}${context}/${appId}/`;
  }

  /** Set the appId */
  setAppId(value: string) {
    this._appId = value;
  }

  /** Set the app version */
  setAppVersion(value: string) {
    this._appVersion = value;
  }

  /** get list of available versions of app data stored */
  appDataVersions(
    context: APPDATA_CONTEXT = APPDATA_CONTEXT.USER,
    appId: string = this._appId,
  ): Promise<{ [key: string]: unknown }> {
    const url = this.resolveAppDataEndpoint(context, appId);
    return this.get(url);
  }

  /** get list of available keys for a stored path */
  appDataKeys(
    path = "",
    context: APPDATA_CONTEXT = APPDATA_CONTEXT.USER,
    appId: string = this._appId,
    version: string = this._appVersion,
  ): Promise<{ [key: string]: unknown }> {
    path = path.length != 0 && path[0] === "/" ? path.slice(1) : path;
    let url = this.resolveAppDataEndpoint(context, appId);
    url += `${version}/${path}?keys=true`;
    return this.get(url);
  }

  /** get stored value at provided path */
  appDataGet(
    path = "",
    context: APPDATA_CONTEXT = APPDATA_CONTEXT.USER,
    appId: string = this._appId,
    version: string = this._appVersion,
  ): Promise<{ [key: string]: unknown }> {
    path = path.length != 0 && path[0] === "/" ? path.slice(1) : path;
    let url = this.resolveAppDataEndpoint(context, appId);
    url += `${version}/${path}`;
    return this.get(url);
  }

  /** set stored value at provided path */
  appDataSet(
    path: string,
    value: { [key: string]: unknown },
    context: APPDATA_CONTEXT = APPDATA_CONTEXT.USER,
    appId: string = this._appId,
    version: string = this._appVersion,
  ): Promise<Response> {
    if (!path) {
      throw new Error("Error: Invalid path!");
    }
    if (path[0] === "/") {
      path = path.slice(1);
    }
    const ep = this.resolveAppDataEndpoint(context, appId);
    if (!ep) {
      throw new Error("Error: Invalid path!");
    }
    return this.post(
      `${ep}${version}/${Path.dotToSlash(path)}`,
      value,
    );
  }

  /** update / patch stored values using Array of JSON patch objects */
  appDataPatch(
    value: Array<JSON_Patch>,
    context: APPDATA_CONTEXT = APPDATA_CONTEXT.USER,
    appId: string = this._appId,
    version: string = this._appVersion,
  ): Promise<Response> {
    const ep = this.resolveAppDataEndpoint(context, appId);
    if (!ep || !version) {
      throw new Error("Error: Invalid path or version!");
    }
    return this.post(`${ep}${version}`, value);
  }
}
