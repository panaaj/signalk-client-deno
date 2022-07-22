import { EventEmitter } from "https://deno.land/x/eventemitter@1.2.1/mod.ts";
import { Alarm, AlarmType, Message } from "./utils.ts";
import { debug } from "./mod.ts";

/** Signal K Stream operations */
export class SignalKStream {
  /** WebSocket connection
   * @private */
  private ws: WebSocket | undefined;
  /** id of vessel to filter delta messages
   * @private
   */
  private _filter = "";

  /** websocket connection timeout
   * @private
   */
  private _wsTimeout = 20000;

  /** Authentication token
   * @private
   */
  private _token = "";

  /** Playback mode flag
   * @private */
  private _playbackMode = false;

  /** source value to use in messages
   * @private
   */
  private _source: any = null;

  /** Client Id for approved device
   * @private
   */
  private _clientId: any = "";

  // **************** ATTRIBUTES ***************************

  /** API version to use */
  public version = 1;
  /** Connection endpoint */
  public endpoint = "";
  /** self identifier value */
  public selfId = "";

  /** Set source label for use in messages 
   * @param val label value
  */
  set source(val: string) {
    if (!this._source) {
      this._source = {};
    }
    this._source['label'] = val;
  }

  /** Set auth token value 
   * @param val token value
  */
  set authToken(val: string) {
    this._token = val;
  }

  /** set clientId value
   * @param val client id value
   */
  set clientId(val: string | undefined) {
    this._clientId = val;
  }

  /** Get websocket connection timeout 3000<=timeout<=60000 */
  get connectionTimeout(): number {
    return this._wsTimeout;
  }

  /** Set websocket connection timeout valid range: 3000 <= timeout <= 60000 */
  set connectionTimeout(val: number) {
    this._wsTimeout = val < 3000 ? 3000 : val > 60000 ? 60000 : val;
  }

  /** Test if WS Stream connected */
  get isOpen(): boolean {
    return this.ws && this.ws.readyState != 1 && this.ws.readyState != 3
      ? true
      : false;
  }

  /** Get filter to select delta messages just for supplied vessel id */
  get filter(): string {
    return this._filter;
  }

  /** Apply a filter for stream messages. Set filter = null to remove message filtering */
  set filter(id: string) {
    if (id && id.indexOf("self") != -1) {
      this._filter = this.selfId ? this.selfId : "";
    } else {
      this._filter = id;
    }
  }

  /** Test for Playback mode */
  get playbackMode(): boolean {
    return this._playbackMode;
  }

  // ******************************************************

  /** Stream events */
  public events: EventEmitter<{
    "connect"(ev: Event): any;
    "close"(ev: Event): any;
    "error"(ev: Event): any;
    "message"(ev: MessageEvent): any;
  }>;

  constructor() {
    this.events = new EventEmitter();
  }

  /** Close WebSocket connection */
  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  /** Open a WebSocket at provided url
   * @param url Stream endpoint
   * @param subscribe Stream subscription params
   * @param token Authentication token
   */
  open(url: string, subscribe?: string, token?: string) {
    url = url ? url : this.endpoint;
    if (!url) {
      return;
    }
    let q = url.indexOf("?") === -1 ? "?" : "&";
    if (subscribe) {
      url += `${q}subscribe=${subscribe}`;
    }
    if (this._token || token) {
      url += `${subscribe ? "&" : "?"}token=${this._token || token}`;
    }

    this.close();
    this.ws = new WebSocket(url);
    // ** start connection watchdog **
    setTimeout(() => {
      if (this.ws && this.ws.readyState != 1 && this.ws.readyState != 3) {
        console.warn(
          `Connection watchdog expired (${
            this._wsTimeout / 1000
          } sec): ${this.ws.readyState}... aborting connection...`,
        );
        this.close();
      }
    }, this._wsTimeout);

    this.ws.onopen = (e: Event) => {
      this.events.emit("connect", e);
    };
    this.ws.onclose = (e: Event) => {
      this.events.emit("close", e);
    };
    this.ws.onerror = (e: Event) => {
      this.events.emit("error", e);
    };
    this.ws.onmessage = (e: MessageEvent) => {
      this.parseOnMessage(e);
    };
  }

  /** Parse received message
   * @param e Received stream message
   */
  private parseOnMessage(e: MessageEvent) {
    let data: any;
    if (typeof e.data === "string") {
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
    }
    if (this.isHello(data)) {
      this.selfId = data.self;
      this._playbackMode = typeof data.startTime != "undefined" ? true : false;
      this.events.emit("message", data);
    } else if (this.isResponse(data)) {
      if (typeof data.login !== "undefined") {
        if (typeof data.login.token !== "undefined") {
          this._token = data.login.token;
        }
      }
      this.events.emit("message", data);
    } else if (this._filter && this.isDelta(data)) {
      if (data.context === this._filter) {
        this.events.emit("message", data);
      }
    } else {
      this.events.emit("message", data);
    }
  }

  /** Send request via stream
   * @param value Stream message payload
   * @returns String containing requestId
   */
  sendRequest(value: any): string {
    if (typeof value !== "object") {
      return "";
    }
    const msg: any = Message.request();
    debug("requestId: ", msg.requestId);
    debug("_token: ", this._token);
    if (typeof value.login === "undefined" && this._token) {
      msg["token"] = this._token;
    }
    debug("_clientId: ", this._clientId);
    if (this._clientId) {
      msg["clientId"] = this._clientId;
    }
    const keys = Object.keys(value);
    keys.forEach((k) => {
      msg[k] = value[k];
    });
    debug("msg: ", msg);
    this.send(msg);
    return msg.requestId;
  }

  /** Send PUT request via stream
   * @param context Signal K context
   * @param path Signal K path value
   * @param value Value to apply to supplied path
   * @returns String containing requestId
   */
  put(context: string, path: string, value: any): string {
    const msg = {
      context: context === "self" ? "vessels.self" : context,
      put: { path: path, value: value },
    };
    return this.sendRequest(msg);
  }

  /** Login with supplied user details
   * @param username User account id
   * @param password User password
   * @returns String containing requestId
   */
  login(username: string, password: string): string {
    const msg = {
      login: { username: username, password: password },
    };
    return this.sendRequest(msg);
  }

  /** Send data via Signal K stream
   * @param data Signal K stream message
   */
  send(data: any) {
    if (this.ws) {
      if (typeof data === "object") {
        data = JSON.stringify(data);
      }
      debug(`sending -> `, data);
      this.ws.send(data);
    }
  }

  /** Send value(s) via delta stream update
   * @param context Signal K context
   * @param {Array} path Array of {path: , value: } objects
   */
  /** Send value(s) via delta stream update
   * @param context Signal K context
   * @param {String} path Signal K path value
   * @param {String} value Value to apply to supplied path
   */
  sendUpdate(context: string, path: Array<any>): void;
  sendUpdate(context: string, path: string, value: any): void;
  sendUpdate(
    context = "self",
    path: string | Array<any>,
    value?: any,
  ) {
    const val: any = Message.updates();
    if (this._token) {
      val["token"] = this._token;
    }
    debug("_clientId: ", this._clientId);
    if (this._clientId) {
      val["clientId"] = this._clientId;
    }
    val.context = context === "self" ? "vessels.self" : context;

    let uValues = [];
    if (typeof path === "string") {
      uValues.push({ path: path, value: value });
    }
    if (typeof path === "object" && Array.isArray(path)) {
      uValues = path;
    }
    const u: any = {
      timestamp: new Date().toISOString(),
      values: uValues,
    };
    if (this._source) {
      u["source"] = this._source;
    }
    val.updates.push(u);
    this.send(val);
  }

  /** Subscribe to Delta stream messages
   * @param context Signal K context
   * @param {Array} path Array of {path: , value: } objects
   */
  /** Subscribe to Delta stream messages
   * @param context Signal K context
   * @param {String} path Signal K path value
   * @param options Subscription options
   */
  subscribe(context: string, path: Array<any>): void;
  subscribe(context: string, path: string, options?: any): void;
  subscribe(
    context = "*",
    path: string | Array<any> = "*",
    options?: any,
  ) {
    const val: any = Message.subscribe();
    if (this._token) {
      val["token"] = this._token;
    }
    val.context = context === "self" ? "vessels.self" : context;
    if (this._token) {
      val["token"] = this._token;
    }

    if (typeof path === "object" && Array.isArray(path)) {
      val.subscribe = path;
    }
    if (typeof path === "string") {
      const sValue: any = {};
      sValue["path"] = path;
      if (options && typeof options === "object") {
        if (options["period"]) {
          sValue["period"] = options["period"];
        }
        if (options["minPeriod"]) {
          sValue["minPeriod"] = options["period"];
        }
        if (
          options["format"] &&
          (options["format"] === "delta" || options["format"] === "full")
        ) {
          sValue["format"] = options["format"];
        }
        if (
          options["policy"] &&
          (options["policy"] === "instant" ||
            options["policy"] === "ideal" ||
            options["policy"] === "fixed")
        ) {
          sValue["policy"] = options["policy"];
        }
      }
      val.subscribe.push(sValue);
    }
    this.send(val);
  }

  /** Unsubscribe from Delta stream messages
   * @param context Signal K context
   * @param path Signal K path value
   */
  unsubscribe(context = "*", path = "*") {
    const val: any = Message.unsubscribe();
    if (this._token) {
      val["token"] = this._token;
    }
    val.context = context === "self" ? "vessels.self" : context;
    if (this._token) {
      val["token"] = this._token;
    }

    if (typeof path === "object" && Array.isArray(path)) {
      val.unsubscribe = path;
    }
    if (typeof path === "string") {
      val.unsubscribe.push({ path: path });
    }
    this.send(val);
  }

 

  /** Raise alarm
   * @param context Signal K context
   * @param name Alarm name
   * @param alarm  Alarm object
   */
  /** Raise alarm
   * @param context Signal K context
   * @param type Alarm type
   * @param alarm  Alarm object
   */
  raiseAlarm(context: string, name: string, alarm: Alarm): void;
  raiseAlarm(context: string, type: AlarmType, alarm: Alarm): void;
  raiseAlarm(context = "*", alarmId: string | AlarmType, alarm: Alarm) {
    let path: string;
    if (typeof alarmId === "string") {
      path = alarmId.indexOf("notifications.") === -1
        ? `notifications.${alarmId}`
        : alarmId;
    } else {
      path = alarmId;
    }
    this.put(context, path, alarm.value);
  }

  /** Clear alarm
   * @param context Signal K context
   * @param name alarm name
   */
  clearAlarm(context = "*", name: string) {
    const path = name.indexOf("notifications.") === -1
      ? `notifications.${name}`
      : name;
    this.put(context, path, null);
  }

  // *************** MESSAGE PARSING ******************************
  /** Tests if message context is 'self'
   * @param msg Received stream message
   */
  isSelf(msg: any): boolean {
    return msg.context === this.selfId;
  }

  /** Tests if message is a Delta message
   * @param msg Received stream message
   */
  isDelta(msg: any): boolean {
    return typeof msg.context != "undefined";
  }

  /** Tests if message is a Hello message
   * @param msg Received stream message
   */
  isHello(msg: any): boolean {
    return typeof msg.version != "undefined" && typeof msg.self != "undefined";
  }

  /** Tests if message is a request Response message
   * @param msg Received stream message
   */
  isResponse(msg: any): boolean {
    return typeof msg.requestId != "undefined";
  }
}
