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

/** Signal K Server information */
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

/** Application data contexts */
export enum APPDATA_CONTEXT {
  USER = "user",
  GLOBAL = "global",
}

/** Signal K Client class */
export class SignalKClient {
  /** Signal K server hostname / ip address.
   * @private
   */
  private hostname = "localhost";
  /** Port to connect on.
   * @private
   */
  private port = 3000;
  /** Protocol to use http / https.
   * @private
   */
  private protocol = "";

  /** Signal K API version to use
   * @private
   */
  private _version = "v1";

  /** Authentication token value
   * @private
   */
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

  /** Server information block */
  public server: Server_Info = {
    endpoints: {},
    info: {
      version: "",
      id: "",
    },
    apiVersions: [],
  };

  /** Endpoints fallback to host address when no hello response */
  public fallback = false;

  /** endpoints are set to host address regardless of contents of hello response */
  public proxied = false;

  /** get preferred Signal K API version to use
   * @property
   */
  get version(): number {
    return parseInt(this._version.slice(1));
  }

  /** set preferred Signal K API version to use
   * @param val Major version number of API. e.g. 1
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
   * @param val Token value
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

  /** Generate and return a v4 UUID */
  get uuid(): string {
    return crypto.randomUUID(); //new UUID();
  }

  /** Generate and return a Signal K UUID */
  get signalkUuid(): string {
    return `urn:mrn:signalk:uuid:${crypto.randomUUID()}`;
  }

  /** Signal K Apps API */
  public apps: SignalKApps;
  /** Signal K HTTP API */
  public api: SignalKHttp;
  /** Signal K stream API */
  public stream: SignalKStream;

  /** Create new Signal K Client */
  constructor() {
    this.apps = new SignalKApps();
    this.api = new SignalKHttp();
    this.stream = new SignalKStream();
    this.init();
  }

  /** Initialise client protocol, hostname and port values.
   * @param hostname Signal K server hostname / IP address
   * @param port Port on which Signal K server is listening
   * @param useSSL If true uses https / wss, if false uses http /ws
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
   * @param hostname Signal K server hostname / IP address
   * @param port Port on which Signal K server is listening
   * @param useSSL If true uses https / wss, if false uses http /ws
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
   * @param hostname Signal K server hostname / IP address
   * @param port Port on which Signal K server is listening
   * @param {useSSL If true uses https / wss, if false uses http /ws
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
   * @param hostname Signal K server hostname / IP address
   * @param port Port on which Signal K server is listening
   * @param useSSL If true uses https / wss, if false uses http /ws
   * @param subscribe Subscription parameters for stream connection
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
   * @param hostname Signal K server hostname / IP address
   * @param port Port on which Signal K server is listening
   * @param useSSL If true uses https / wss, if false uses http /ws
   * @param options Options for playback stream connection
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
   * @param url Signal K stream endpoint url
   * @param subscribe Subscription parameters for stream connection
   * @param token Authentication token
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
   * @param url Signal K stream endpoint url
   * @param options Options for playback stream connection
   * @param token Authentication token
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
   * @params Recieved hello response from server.
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

  /** Return signalk apps API url */
  private resolveAppsEndpoint(): string {
    return this.resolveHttpEndpoint().replace("api", "apps");
  }

  /** Return preferred WS stream url */
  private resolveStreamEndpoint(): string {
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

  /** Return signalk-http endpoint url */
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

  /** Cleanup after server disconnection. */
  private disconnectedFromServer() {
    this.server.endpoints = {};
    this.server.info = {
      version: "",
      id: "",
    };
    this.server.apiVersions = [];
  }

  /** HTTP GET from API path.
   * @param path Signal K path.
   */
  async get(path: string): Promise<{ [key: string]: unknown }> {
    if (path && path.length > 0 && path[0] === "/") {
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
   * @param path Signal K path.
   * @param value Value to apply.
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

  /** HTTP POST to API path.
   * @param {string} path Signal K path.
   * @param value Value to apply.
   */
  async post(path: string, value: unknown): Promise<Response> {
    if (path && path.length > 0 && path[0] === "/") {
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

  /** Login and retrieve an  auth token for supplied user details
   * @param username User id
   * @param password User password
   */
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

  /** Validate / refresh token from server */
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

  /** Logout from server */
  logout(): Promise<boolean> {
    const url =
      `${this.protocol}://${this.hostname}:${this.port}/signalk/${this._version}/auth/logout`;

    debug(`put ${url}`);
    const headers = new Headers({ "Content-Type": "application/json" });
    if (this._token) {
      headers.append("Authorization", `JWT ${this._token}`);
    }

    const options = {
      method: "PUT",
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
   * @returns True if user is logged in.
   */
  async isLoggedIn(): Promise<boolean> {
    const response = await this.getLoginStatus();
    return response.status === "loggedIn" ? true : false;
  }

  /** Fetch Signal K login status from server */
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

  /** Get data via the snapshot http api path for supplied time.
   * @param Signal K context
   * @param time As ISO formatted time string.
   */
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
   *  Access Requests
   *******************************/
  public clientId: string | undefined;

  /** Access request methods
   * @param name Name of sensor / process requesting access
   * @param id Client id
   */
  async accessRequest(
    name: string,
    id?: string,
  ): Promise<{ [key: string]: unknown }> {
    if (!name) {
      throw new Error("Error: Name not supplied!");
    }

    if (!id && !this.clientId) {
      this.clientId = this.uuid;
    } else if (!this.clientId) {
      this.clientId = id;
    }
    this.stream.clientId = this.clientId;

    const response = await this.post(
      `/signalk/${this._version}/access/requests`,
      {
        clientId: this.clientId,
        description: name,
      },
    );
    return response.json();
  }

  /** Check status of an access request.
   * @param href url path returned in the access request PENDING response.
   */
  async checkAccessRequest(href: string): Promise<{ [key: string]: unknown }> {
    if (!href) {
      throw new Error("Error: href not supplied!");
    }
    return await this.get(href);
  }

  /*******************************
   *  applicationData api methods
   * context: 'user' or 'global'
   * appId: application id string
   *******************************/

  /** Target application id.
   * @private
   */
  private _appId = "";

  /** Target application version.
   * @private
   */
  private _appVersion = "";

  /** Return endpoint for target app. */
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

  /** Set the appId.
   * @param value Application id.
   */
  setAppId(value: string) {
    this._appId = value;
  }

  /** Set the app version.
   * @param value Application version.
   */
  setAppVersion(value: string) {
    this._appVersion = value;
  }

  /** Get list of available versions of app data stored
   * @param context Signal K context
   * @param appId Application id.
   */
  appDataVersions(
    context: APPDATA_CONTEXT = APPDATA_CONTEXT.USER,
    appId: string = this._appId,
  ): Promise<{ [key: string]: unknown }> {
    const url = this.resolveAppDataEndpoint(context, appId);
    return this.get(url);
  }

  /** Get list of available keys for a stored path
   * @param path Path to app data
   * @param context Signal K context
   * @param appId Application id
   * @param version Version of data
   */
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

  /** Get stored value at provided path
   * @param path Path to app data
   * @param context Signal K context
   * @param appId Application id
   * @param version Version of data
   */
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

  /** Set stored value at provided path
   * @param path Path to app data
   * @param context Signal K context
   * @param appId Application id
   * @param version Version of data
   */
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

  /** update / patch stored values using Array of JSON patch objects
   * @param path Path to app data
   * @param context Signal K context
   * @param appId Application id
   * @param version Version of data
   */
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
