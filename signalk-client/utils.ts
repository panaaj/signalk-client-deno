import { UUID } from './uuid.ts';

// ** Path utilities
export class Path {
  // ** transform dot notation to slash
  static dotToSlash(path: string): string {
    const p = path.split('?');
    if (p[0].indexOf('.') != -1) {
      p[0] = p[0].split('.').join('/');
    }
    return p.join('?');
  }

  // ** parse context to valid Signal K path
  static contextToPath(context: string): string {
    const res = context === 'self' ? 'vessels.self' : context;
    return res.split('.').join('/');
  }
}

// ** Message templates **
export class Message {
  // ** return UPDATES message object
  static updates() {
    // array values= { values: [ {path: xx, value: xx } ] }
    return {
      context: null,
      updates: [],
    };
  }
  // ** return SUBSCRIBE message object
  static subscribe() {
    /* array values= {
            "path": "path.to.key",
            "period": 1000,
            "format": "delta",
            "policy": "ideal",
            "minPeriod": 200
            } */
    return {
      context: null,
      subscribe: [],
    };
  }
  // ** return UNSUBSCRIBE message object
  static unsubscribe() {
    // array values= { "path": "path.to.key" }
    return {
      context: null,
      unsubscribe: [],
    };
  }
  // ** return REQUEST message object
  static request() {
    return {
      requestId: new UUID().toString(),
    };
  }
}

// ** Alarm message **
export class Alarm {
  private _state: AlarmState;
  private _method: Array<AlarmMethod> = [];
  private _message = '';

  constructor(
    message: string,
    state?: AlarmState,
    visual?: boolean,
    sound?: boolean,
  ) {
    this._message = typeof message !== 'undefined' ? message : '';
    this._state = typeof state !== 'undefined' ? state : AlarmState.alarm;
    if (visual) {
      this._method.push(AlarmMethod.visual);
    }
    if (sound) {
      this._method.push(AlarmMethod.sound);
    }
  }

  get value() {
    return {
      message: this._message,
      state: this._state,
      method: this._method,
    };
  }
}

export enum AlarmState {
  normal = 'normal',
  alert = 'alert',
  warn = 'warn',
  alarm = 'alarm',
  emergency = 'emergency',
}

export enum AlarmMethod {
  visual = 'visual',
  sound = 'sound',
}

export enum AlarmType {
  mob = 'notifications.mob',
  fire = 'notifications.fire',
  sinking = 'notifications.sinking',
  flooding = 'notifications.flooding',
  collision = 'notifications.collision',
  grounding = 'notifications.grounding',
  listing = 'notifications.listing',
  adrift = 'notifications.adrift',
  piracy = 'notifications.piracy',
  abandon = 'notifications.abandon',
}
