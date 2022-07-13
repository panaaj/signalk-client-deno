
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
  /** transform path value from dot notation to slash notation
   * @param path In dot notation e.g. navigation.position
   * @returns Path in slash notation e.g. navigation/position
   */
  static dotToSlash(path: string): string {
    const p = path.split("?");
    if (p[0].indexOf(".") != -1) {
      p[0] = p[0].split(".").join("/");
    }
    return p.join("?");
  }

  /** parse context to valid Signal K path
   * @param context value in dot notation
   * @returns context in slash notation
   */
  static contextToPath(context: string): string {
    const res = context === "self" ? "vessels.self" : context;
    return res.split(".").join("/");
  }
}

/** Class with methods to return skeleton Signal K request payloads */
export class Message {

  /** returns UPDATES message object */
  static updates(): {
    context: string | null;
    updates: Array<{ path: string; value: unknown }>;
  } {
    return {
      context: null,
      updates: [],
    };
  }

  /** returns SUBSCRIBE message object */
  static subscribe(): {
    context: string | null;
    subscribe: Array<Subscription>;
  } {
    return {
      context: null,
      subscribe: [],
    };
  }

  /** returns UNSUBSCRIBE message object */
  static unsubscribe(): {
    context: string | null;
    unsubscribe: Array<{ path: string }>;
  } {
    return {
      context: null,
      unsubscribe: [],
    };
  }

  /** returns REQUEST message object */
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
  /** Alarm State
   * @private
   */
  private _state: AlarmState;
  /** Alarm Method
   * @private
   */
  private _method: Array<AlarmMethod> = [];
  /** Alarm Message text
   * @private
   */
  private _message = "";

  /**
   * @param message Alarm message text
   * @param state Alarm state
   * @param visual Set true for visual prompt
   * @param sound Set true for audibile alarm
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

  /** Returns object containing Alarm attributes. */
  get value(): AlarmMessage {
    return {
      message: this._message,
      state: this._state,
      method: this._method,
    };
  }
}

/** AlarmState values */
export enum AlarmState {
  normal = "normal",
  alert = "alert",
  warn = "warn",
  alarm = "alarm",
  emergency = "emergency",
}

/** AlarmMethod values */
export enum AlarmMethod {
  visual = "visual",
  sound = "sound",
}

/** AlarmType values */
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
