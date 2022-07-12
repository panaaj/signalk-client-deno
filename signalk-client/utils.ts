
/** Signal K stream subscripton. */
export interface Subscription {
  path: string;
  period?: number;
  format?: "delta" | "full";
  policy?: "instant" | "ideal" | "fixed";
  minPeriod?: number;
}

/** Signal K Path functions */
export class Path {
  /** transform dot notation to slash
   * @static
   * @param {string} path
   * @returns {string}
   */
  static dotToSlash(path: string): string {
    const p = path.split("?");
    if (p[0].indexOf(".") != -1) {
      p[0] = p[0].split(".").join("/");
    }
    return p.join("?");
  }

  /** parse context to valid Signal K path
   * @static
   * @param {string} context
   * @returns {string}
   */
  static contextToPath(context: string): string {
    const res = context === "self" ? "vessels.self" : context;
    return res.split(".").join("/");
  }
}

/** Signal K Message class */
export class Message {
  /** return UPDATES message object
   * @static
   */
  static updates(): {
    context: string | null;
    updates: Array<{ path: string; value: unknown }>;
  } {
    return {
      context: null,
      updates: [],
    };
  }
  /**
   * return SUBSCRIBE message object
   * @static
   */
  static subscribe(): {
    context: string | null;
    subscribe: Array<Subscription>;
  } {
    return {
      context: null,
      subscribe: [],
    };
  }
  /** return UNSUBSCRIBE message object
   * @static
   */
  static unsubscribe(): {
    context: string | null;
    unsubscribe: Array<{ path: string }>;
  } {
    return {
      context: null,
      unsubscribe: [],
    };
  }
  /** return REQUEST message object
   * @static
   */
  static request(): { requestId: string } {
    return {
      requestId: crypto.randomUUID(),
    };
  }
}

interface AlarmMessage {
  message: string;
  state: AlarmState;
  method: AlarmMethod[];
}

/** Signal K Alarm class */
export class Alarm {
  private _state: AlarmState;
  private _method: Array<AlarmMethod> = [];
  private _message = "";

  /**
   * @param {string} message
   * @param {AlarmState} state
   * @param {boolean} visual
   * @param {boolean} sound
   */
  constructor(
    message: string,
    state?: AlarmState,
    visual?: boolean,
    sound?: boolean,
  ) {
    this._message = typeof message !== "undefined" ? message : "";
    this._state = typeof state !== "undefined" ? state : AlarmState.alarm;
    if (visual) {
      this._method.push(AlarmMethod.visual);
    }
    if (sound) {
      this._method.push(AlarmMethod.sound);
    }
  }

  /** Get object containing Alarm attributes. */
  get value(): AlarmMessage {
    return {
      message: this._message,
      state: this._state,
      method: this._method,
    };
  }
}

/** AlarmState values
 * @enum
 */
export enum AlarmState {
  normal = "normal",
  alert = "alert",
  warn = "warn",
  alarm = "alarm",
  emergency = "emergency",
}

/** AlarmMethod values
 * @enum
 */
export enum AlarmMethod {
  visual = "visual",
  sound = "sound",
}

/** AlarmType values
 * @enum
 */
export enum AlarmType {
  mob = "notifications.mob",
  fire = "notifications.fire",
  sinking = "notifications.sinking",
  flooding = "notifications.flooding",
  collision = "notifications.collision",
  grounding = "notifications.grounding",
  listing = "notifications.listing",
  adrift = "notifications.adrift",
  piracy = "notifications.piracy",
  abandon = "notifications.abandon",
}
