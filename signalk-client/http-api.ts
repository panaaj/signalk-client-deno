import { Alarm, AlarmType, Path } from './utils.ts';
import { SKServer } from './signalk-client.ts';
import { debug } from './mod.ts';

export class SignalKHttp {
  private _token = '';

  public server: SKServer = { version: '', id: '' };
  public endpoint = '';
  public version = 1;

  // ** set auth token value **
  set authToken(val: string) {
    this._token = val;
  }

  // *******************************************************

  constructor() {}

  // ** get the contents of the Signal K tree pointed to by self. returns: Promise
  getSelf(): Promise<{ [key: string]: unknown }> {
    return this.get(`vessels/self`);
  }

  //** get ID of vessel self via http. returns: Promise
  getSelfId(): Promise<{ [key: string]: unknown }> {
    return this.get(`self`);
  }

  // ** return observable response for meta object at the specified context and path
  getMeta(context: string, path: string): Promise<{ [key: string]: unknown }> {
    return this.get(
      `${Path.contextToPath(context)}/${Path.dotToSlash(path)}/meta`,
    );
  }

  //** get API path value via http. returns: Promise

  async get(path: string): Promise<{ [key: string]: unknown }>;
  async get(version: number, path: string): Promise<{ [key: string]: unknown }>;
  async get(p1: any, p2?: any) {
    if (!this.endpoint) {
      return;
    }
    let ep: string;
    let path: string;
    if (typeof p1 === 'number') {
      ep = this.endpoint.replace(new RegExp('/v[0-9]+/'), `/v${p1}/`);
      path = Path.dotToSlash(p2);
    } else {
      ep = this.endpoint;
      path = Path.dotToSlash(p1);
    }
    if (path[0] === '/') {
      path = path.slice(1);
    }
    const url = `${ep}${path}`;
    debug(`get ${url}`);
    const options: RequestInit = {};

    if (this._token) {
      options.headers = new Headers({ Authorization: `JWT ${this._token}` });
    }
    const response = await fetch(url, options);
    return response.json();
  }

  // ** patch for v2 & above PUT handling of resourcesApi / courseApi
  private parseApiPut(version: number, value: any) {
    if (version > 1) {
      return value;
    } else {
      return { value: value };
    }
  }

  //** send value to API path via http PUT. returns: Promise
  async put(path: string, value: any): Promise<Response>;
  async put(version: number, path: string, value: any): Promise<Response>;
  async put(p1: any, p2: string, p3?: any) {
    if (!this.endpoint) {
      return;
    }
    let ep: string;
    let path: string;
    let value;
    let msg;
    if (typeof p1 === 'number') {
      ep = this.endpoint.replace(new RegExp('/v[0-9]+/'), `/v${p1}/`);
      path = Path.dotToSlash(p2);
      value = p3;
      msg = this.parseApiPut(p1, value);
    } else {
      ep = this.endpoint;
      path = Path.dotToSlash(p1);
      value = p2;
      msg = this.parseApiPut(this.version, value);
    }
    if (path[0] == '/') {
      path = path.slice(1);
    }

    const url = `${ep}${path}`;
    debug(`put ${url}`);
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (this._token) {
      headers.append('Authorization', `JWT ${this._token}`);
    }

    const options: RequestInit = {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify(msg),
    };
    return await fetch(url, options);
  }

  //** send value to API path via http PUT. returns: Promise
  async putWithContext(
    context: string,
    path: string,
    value: any,
  ): Promise<Response>;
  async putWithContext(
    version: number,
    context: string,
    path: string,
    value: any,
  ): Promise<Response>;
  async putWithContext(p1: any, p2: any, p3?: any, p4?: any) {
    if (!this.endpoint) {
      return;
    }
    let ep: string;
    let path: string;
    let context: string;
    let value;
    let msg;
    if (typeof p1 === 'number') {
      ep = this.endpoint.replace(new RegExp('/v[0-9]+/'), `/v${p1}/`);
      context = p2 ? `${Path.contextToPath(p2)}/` : '';
      path = Path.dotToSlash(p3);
      value = p4;
      msg = this.parseApiPut(p1, value);
    } else {
      ep = this.endpoint;
      context = p1 ? `${Path.contextToPath(p1)}/` : '';
      path = Path.dotToSlash(p2);
      value = p3;
      msg = this.parseApiPut(this.version, value);
    }
    if (path[0] === '/') {
      path = path.slice(1);
    }

    const url = ep + context + path;
    debug(`put ${url}`);
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (this._token) {
      headers.append('Authorization', `JWT ${this._token}`);
    }

    const options: RequestInit = {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify(msg),
    };
    return await fetch(url, options);
  }

  //** send value to API path via http POST. returns: Promise
  async post(path: string, value: any): Promise<Response>;
  async post(version: number, path: string, value: any): Promise<Response>;
  async post(p1: any, p2: string, p3?: any) {
    if (!this.endpoint) {
      return;
    }
    let ep: string;
    let path: string;
    let value;
    if (typeof p1 === 'number') {
      ep = this.endpoint.replace(new RegExp('/v[0-9]+/'), `/v${p1}/`);
      path = Path.dotToSlash(p2);
      value = p3;
    } else {
      ep = this.endpoint;
      path = Path.dotToSlash(p1);
      value = p2;
    }
    if (path[0] == '/') {
      path = path.slice(1);
    }
    const url = `${ep}${path}`;
    debug(`post ${url}`);
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (this._token) {
      headers.append('Authorization', `JWT ${this._token}`);
    }

    const options: RequestInit = {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(value),
    };
    return await fetch(url, options);
  }

  //** delete value from API path via http DELETE. returns: Promise
  async delete(path: string): Promise<Response>;
  async delete(version: number, path: string): Promise<Response>;
  async delete(p1: any, p2?: any) {
    if (!this.endpoint) {
      return;
    }
    let ep: string;
    let path: string;
    if (typeof p1 === 'number') {
      ep = this.endpoint.replace(new RegExp('/v[0-9]+/'), `/v${p1}/`);
      path = Path.dotToSlash(p2);
    } else {
      ep = this.endpoint;
      path = Path.dotToSlash(p1);
    }
    if (path[0] == '/') {
      path = path.slice(1);
    }
    const url = `${ep}${path}`;
    debug(`get ${url}`);
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (this._token) {
      headers.append('Authorization', `JWT ${this._token}`);
    }

    const options: RequestInit = {
      method: 'DELETE',
      headers: headers,
    };
    return await fetch(url, options);
  }

  // ** raise alarm for path (name), returns: Promise
  raiseAlarm(context: string, name: string, alarm: Alarm): Promise<Response>;
  raiseAlarm(context: string, type: AlarmType, alarm: Alarm): Promise<Response>;
  raiseAlarm(context = '*', alarmId: string | AlarmType, alarm: Alarm) {
    let path: string;
    if (typeof alarmId === 'string') {
      path = alarmId.indexOf('notifications.') == -1
        ? `notifications.${alarmId}`
        : alarmId;
    } else {
      path = alarmId;
    }
    return this.putWithContext(context, path, alarm.value);
  }

  // ** raise alarm for path (name), returns: Promise
  clearAlarm(context = '*', name: string): Promise<Response> {
    const path = name.indexOf('notifications.') === -1
      ? `notifications.${name}`
      : name;
    return this.putWithContext(context, path, null);
  }
}
