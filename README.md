# Signal K client for Deno

**signalk_client** is a library to facilitate communication with a Signal K
server.

It provides the following classes to interact with the Signal K `HTTP` and
`STREAM` APIs as well as exposing STREAM `Events`:

[api](HTTP_API.md): class for interacting with Signal K HTTP API

[stream](STREAM_API.md): class for interacting with Signal K STREAM API

[apps](APPS.md): class to enable interaction with applications installed on the
Signal K server.

See [signalk-client API](#signalkclient-api) below for details.

---

## Usage

```
import { SignalKClient } from 'https://deno.land/x/signalk_client/mod.ts'
```

The simplest way to get started is to connect to a Signal K server and open a
websocket to its data stream.

To do this:

1. Use `connectStream(...)` to connect to the server and open the data stream.

2. Subscribe to the `stream` events to process the received data

_Example:_

```javascript
const signalk = new SignalKClient();

// **** Subscribe to Signal K Stream events ***

signalk.stream.events.on(
    'connect',
    (ev:Event) => {
        console.log('** Connect Event: ', ev);
    }
);

signalk.stream.events.on(
    'close',
    (ev:Event) => {
        console.log('** Close Event: ', ev);
    }
);

signalk.stream.events.on(
    'error',
    (ev:Event) => {
        console.log('** Error Event: ', ev);
    }
);

signalk.stream.events.on(
    'message',
    (ev:Event) => {
        console.log('** Message Event: ', ev);
    }
);

// **** CONNECT to Server and open STREAM ****
signalk.connectStream('192.168.99.100', 80, false, 'self');
```

Once connected you can then interact with both the STREAM and HTTP APIs in the
following ways:

- Use the `stream` object to interact with the websocket connection.

```javascript
// **** send data to STREAM API ****
signalk.stream.send({..data..});
```

- Use the `api` object to interact Signal K HTTP API path. `/signalk/v1/api/`

_Example:_

```javascript
// **** make HTTP API request ****
try {
    const response = await signalk.api.get('vessels/self/navigation/position');
}
catch {
    ...
}
```

### Connect and open Stream on Demand

---

If you want to just use the HTTP API or defer the connection to the STREAM API
based on user interaction use the `connect(..)` method.

1. Use `connect(...)` to connect to the server and perform endpoint discovery.

2. When you are ready to connect to the STREAM API use `openStream()` ( or
   `stream.open()` ) with a `null` or `undefined` _url_ parameter. This will
   cnnect to the discovered stream endpoint.

_Example:_

```javascript
const signalk = new SignalKClient();

// **** Subscribe to Signal K Stream events ***

signalk.stream.events.on(
    'connect',
    (ev:Event) => {
        console.log('** Connect Event: ', ev);
    }
);

signalk.stream.events.on(
    'close',
    (ev:Event) => {
        console.log('** Close Event: ', ev);
    }
);

signalk.stream.events.on(
    'error',
    (ev:Event) => {
        console.log('** Error Event: ', ev);
    }
);

signalk.stream.events.on(
    'message',
    (ev:Event) => {
        console.log('** Message Event: ', ev);
    }
);

// **** CONNECT to Server ****
signalk.connect('192.168.99.100', 80, false, 'self');

... 

signalk.openStream( null, 'self');

OR

signalk.stream.open( null, 'self');
```

### Use with non-HTTP enabled Signal K server

---

By default the **connect** methods will cause an HTTP request to be sent to the
server `/signalk` path to discover the server's advertised endpoints.

To interact with the server without using endpoint discovery use the
`openStream(<hostname>, <port>)` method specifying the host ip address and port.

_Note: No HTTP endpoint discovery is performed when using `openXX()` methods and
specifying a host._

_Example:_

```javascript
const signalk = new SignalKClient();

// **** Subscribe to Signal K Stream events ***

signalk.stream.events.on(
    'connect',
    (ev:Event) => {
        console.log('** Connect Event: ', ev);
    }
);

signalk.stream.events.on(
    'close',
    (ev:Event) => {
        console.log('** Close Event: ', ev);
    }
);

signalk.stream.events.on(
    'error',
    (ev:Event) => {
        console.log('** Error Event: ', ev);
    }
);

signalk.stream.events.on(
    'message',
    (ev:Event) => {
        console.log('** Message Event: ', ev);
    }
);

// **** Open the STREAM ****
signalk.openStream('192.168.99.100', 80, false, 'self');
```

# SignalKClient API

SignalKClient contains the following classes to interact with Signal K API's:

[api](HTTP_API.md): class for interacting with Signal K HTTP API

[stream](STREAM_API.md): class for interacting with Signal K STREAM API

[apps](APPS.md): class to enable interaction with applications installed on the
Signal K server.

_Follow the links for the relevant documentation._

[Attributes](#attributes)

- `server`
- `version`
- `authToken`
- `uuid`
- `signalkUuid`
- `proxied`

[Methods](#methods)

- `hello()`
- `connect()`
- `disconnect()`
- `connectStream()`
- `connectPlayback()`
- `openStream()`
- `openPlayback()`
- `snapshot()`
- `resovleStreamEndpoint()`
- `get()`
- `put()`
- `post()`
- `login()`
- `logout()`
- `isLoggedIn()`
- `setAppId()`
- `setAppVersion()`
- `appDataVersions()`
- `appDataKeys()`
- `appDataGet()`
- `appDataSet()`
- `appDataPatch()`

---

### Attributes:

`server`:

Information returned from Signal K server _hello_ response.

```javascript
{
    endpoints: {},
    info: {},
    apiVersions: []
}
```

_apiVersions_ Constains list of api versions supported by the Signal K server.

---

`version`:

Get / Set preferred Signal K API version to use when the server supports more
than one version. _This must be used prior to connecting to the server._ If the
Signal K server does not supports the specified version `v1` will be used.

_Note: Signal K API is currently only available in `v1`._

_Example:_

```javascript
    // ** set target version **
    signalk.version=2;

    // ** connect to server **
    signalk.connect(...);

    // ** get the version currently in use **
    console.log(signalk.version)
```

---

`authToken`:

A token string to be used for authentication when interacting with the Signal K
server.

Use the `login()` method to authenticate to the server and retrieve a token for
the specified user.

_Example:_

```javascript
signalk.authToken = "<auth_token_string>";
```

Once you have supplied an `authToken` it will be used for all subsequent
operations.

---

`uuid`:

Returns a v4 UUID string

_Example:_

```javascript
let uuid = signalk.uuid;

// returns 27b88354-9fe0-4952-9ce6-c9d4eaea6d9e
```

---

`signalkUuid`:

Returns a formatted Signal K resource identifier

_Example:_

```javascript
let uuid = signalk.signalkUuid;

// returns urn:mrn:signalk:uuid:27b88354-9fe0-4952-9ce6-c9d4eaea6d9e
```

---

`proxied`:

Boolean value to indicate whether the Signal K server that is being connected to
is behind a proxy server.

- `false` (default): Uses endpoints received in the `hello()` response.

- `true`: Replaces protocol, host & port values of endpoint values received in
  the `hello()` response with those from connection.

_Example: `proxied = false` (default)_

```javascript
proxied = false;

// Signal K server url: http://myServer.org:3000
signalk.connect('myServer.org');

// hello response
{
    ...
    endpoints: {
        "signalk-http":"http://myServer.org:3000/signalk/v1/api/",
        "signalk-ws":"ws://myServer.org:3000/signalk/v1/stream"
    }
} 

// endpoints used are those received in hello response.
```

_Example: `proxied = true`_

```javascript
proxied = true;

// Proxied Signal K server url: https://myServer.org:3100
signalk.connect('myServer.org', 3100, true);

//hello response 
{
    ...
    endpoints: {
        "signalk-http":"http://myServer.org:3000/signalk/v1/api/",
        "signalk-ws":"ws://myServer.org:3000/signalk/v1/stream"
    }
} 

// received endpoint values are modified to include the proxy url values.
endpoints: {
    "signalk-http":"https://myServer.org:3100/signalk/v1/api/",
    "signalk-ws":"wss://myServer.org:3100/signalk/v1/stream"
}
```

---

### Methods:

`hello(hostname, port, useSSL): Promise`

Send _discovery_ request to the Signal K server `/signalk` path.

_Note: SignalKClient is not considered **connected** after using this method._

_Parameters:_

- _hostname_: host name or ip address

- _port_: port number

- _useSSL_: true: uses secure socket protocols _(https / wss)_

_Returns_: Observable

_Example:_

```javascript
// **** make Discovery request ****
const response = await signalk.hello("myServer", 80, false);
```

---

`connect(hostname, port, useSSL, subscribe): Promise`

This method performs the following:

1. Issues a `hello()` request
2. Populates the `server` attibute with the received data

_Parameters:_

- _hostname_: host name or ip address

- _port_: port number

- _useSSL_: true: uses secure socket protocols _(https / wss)_

- _subscribe_: Signal K subcription request value: 'all', 'self' or 'none'.
  _(Uses server default if null)_

_Returns_: Promise

_Example:_

```javascript
const response = await signalk.connect("myServer", 80, false);
```

---

`disconnect()`

Disconnects from Signal K server and closes all connections.

_Example:_

```javascript
signalk.disconnect();
```

---

`connectStream(hostname, port, useSSL, subscribe): Promise<boolean>`

Connect to Signal K server and and open a connection to the STREAM API after
performing service endpoint discovery.

This method performs the following:

1. Calls `connect()`
2. Opens a connection to the discovered Stream endpoint.

_Parameters:_

- _hostname_: host name or ip address

- _port_: port number

- _useSSL_: true: uses secure socket protocols _(https / wss)_

- _subscribe_: Signal K subcription request value: 'all', 'self' or 'none'.
  _(Uses server default if null)_

_Returns_: Promise

_Example:_

```javascript
// **** Subscribe to Signal K Stream events ***

signalk.stream.events.on(
    'connect',
    (ev:Event) => {
        console.log('** Connect Event: ', ev);
    }
);

signalk.stream.events.on(
    'close',
    (ev:Event) => {
        console.log('** Close Event: ', ev);
    }
);

signalk.stream.events.on(
    'error',
    (ev:Event) => {
        console.log('** Error Event: ', ev);
    }
);

signalk.stream.events.on(
    'message',
    (ev:Event) => {
        console.log('** Message Event: ', ev);
    }
);

// **** CONNECT to Delta Stream ****
signalk.connectStream('192.168.99.100', 80, false, 'self');
```

---

`connectPlayback(hostname, port, useSSL, options): Promise<boolean>`

Connect to Signal K server and and open a connection to the PLAYBACK STREAM API
after performing service endpoint discovery.

This method performs the following:

1. Calls `connect()`
2. Calls `openPlayback()`.

_Parameters:_

- _hostname_: host name or ip address

- _port_: port number

- _useSSL_: true: uses secure socket protocols _(https / wss)_

- _options_: Signal K Playback options

```javascript
{ 
    startTime: *Date / Time to start playback from.
    playbackRate: A number defining the rate at which data is sent.
    subscribe: 'all', 'self' or 'none'. *(Uses server default if null)*
}
```

_Returns_: Promise

_Example:_

```javascript
// **** Subscribe to Signal K Stream events ***

signalk.stream.events.on(
    'connect',
    (ev:Event) => {
        console.log('** Connect Event: ', ev);
    }
);

signalk.stream.events.on(
    'close',
    (ev:Event) => {
        console.log('** Close Event: ', ev);
    }
);

signalk.stream.events.on(
    'error',
    (ev:Event) => {
        console.log('** Error Event: ', ev);
    }
);

signalk.stream.events.on(
    'message',
    (ev:Event) => {
        console.log('** Message Event: ', ev);
    }
);  

// **** CONNECT to Playback Stream ****

const response = await signalk.connectPlayback('myServer', 80, false, {
    subscribe: 'self',
    playbackRate: 1,
    startTime: '2019-01-19T07:14:58Z'
});
```

---

`openStream(url, subscribe, token)`

Connect direct to Signal K server DELTA stream using the supplied parameters
without performing _endpoint discovery_.

This method is for use when there is no HTTP API available.

_Paramaters:_

- _url_: url of Signal K stream endpoint.

- _subscribe_: Signal K subcription request value: 'all', 'self' or 'none'.
  _(Uses server default if null)_

- _token_: Authentication token.

_Returns_: true or throws on error Subscribe to `signalk.stream.events`to
receive results of actions.

```javascript
// **** Subscribe to Signal K Stream events ***

signalk.stream.events.on(
    'connect',
    (ev:Event) => {
        console.log('** Connect Event: ', ev);
    }
);

signalk.stream.events.on(
    'close',
    (ev:Event) => {
        console.log('** Close Event: ', ev);
    }
);

signalk.stream.events.on(
    'error',
    (ev:Event) => {
        console.log('** Error Event: ', ev);
    }
);

signalk.stream.events.on(
    'message',
    (ev:Event) => {
        console.log('** Message Event: ', ev);
    }
);   

// **** Open the Signal K Stream ****
const result = await signalk.openStream( 'stream_url', 'self');
```

---

`openPlayback(url, options, token)`

Connect direct to Signal K server PLAYBACK stream using the supplied parameters
without performing _endpoint discovery_.

This method is for use when there is no HTTP API available.

_Paramaters:_

- _url_: url of Signal K playback endpoint.

- _options_: Signal K Playback options

```javascript
{ 
    startTime: *Date / Time to start playback from.
    playbackRate: A number defining the rate at which data is sent.
    subscribe: 'all', 'self' or 'none'. *(Uses server default if null)*
}
```

- _token_: Authentication token.

_Returns_: true or throws on error. Subscribe to `signalk.stream.events` to
receive results of actions.

```javascript
// **** Subscribe to Signal K Stream events ***

signalk.stream.events.on(
    'connect',
    (ev:Event) => {
        console.log('** Connect Event: ', ev);
    }
);

signalk.stream.events.on(
    'close',
    (ev:Event) => {
        console.log('** Close Event: ', ev);
    }
);

signalk.stream.events.on(
    'error',
    (ev:Event) => {
        console.log('** Error Event: ', ev);
    }
);

signalk.stream.events.on(
    'message',
    (ev:Event) => {
        console.log('** Message Event: ', ev);
    }
);  

// **** CONNECT to Signal K Stream ****
const result = signalk.openStream( 'playback_url', {
    subscribe: 'self',
    playbackRate: 1,
    startTime: '2019-01-19T07:14:58Z'
});
```

---

`resolveStreamEndpoint()`

Returns preferred STREAM API url based on:

1. Discovered stream endpoint urls

2. Preferred API version set with `version` attribute.

---

`get(path)`

Make a HTTP request to a path relative to Signal K server root path.
_`http(s)://server:port/`_.

_Parameters:_

- _path_: path relative to Signal K srver root

_Returns_: Observable

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...

// **** make HTTP GET request ****
const response = await signalk.get('/plugins');
```

---

`put(path, value)`

Make a HTTP PUT request to a path relative to Signal K server root path.
_`http(s)://server:port/`_.

_Parameters:_

- _path_: path relative to Signal K srver root

- _value_: Value to assign

_Returns_: Observable

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...

// **** make HTTP PUT request ****
const response = await signalk.put('/plugins/plugin-name/acton');
```

---

`post(path, value)`

Make a HTTP POST request to a path relative to Signal K server root path.
_`http(s)://server:port/`_.

_Parameters:_

- _path_: path relative to Signal K srver root

- _value_: Value to assign

_Returns_: Observable

_Example:_

```javasript
// ** connect to server **
signalk.connect(...);

...

// **** make HTTP POST request ****
const response = await signalk.post('/plugins/plugin-name/acton');
```

---

`snapshot(context, time): Promise`

**History Snapshot Retrieval**

Request from the Signal K server the part of the full model at the requested
time.

_Parameters:_

- _context_: Signal K context _e.g. 'vessels._<uuid_>', 'self'_

- _time_: date/time in ISO format _eg: 2018-08-24T15:19:09Z_

_Returns_: Promise

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...
const response = await signalk.snapshot(
    'self',
    new Date().toISOString()
);
```

---

### AUTHENTICATION:

Signal K servers with security enabled will require an authentication token
assigned to the `authToken` attribute to access protected HTTP and STREAM APIs.

You can assign `authToken`:

- A valid token you have already generated

- Retrieve a token for a specific user by usingthe `login()` method providing
  _username / password_

_Note: if a Signal K server has security enabled and you have not provided a
valid `authToken` an Error event will be triggered to notify of this situation._

---

`login(user, password): Promise`

Authenticate with Signal K server and if successful apply the supplied
`JWT token` value to `authToken` so it is used in subsequent operations so it is
used in subsequent operations.

_Parameters:_

-_user_: User name

-_password_: User's password

_Returns_: Promise containing object.

```javascript
{
  ok: true, //value of response ok
  status: 200, // value of response status
  token: '...' // auth token
}
```

_Example:_

```javascript
const response = await signalk.connect(myserver, 80, false);

// ** login
const response = await signalk.login("myuser", "mypassword");
```

---

`validate(): Promise`

Validates / renews the auth token.

_Parameters:_

-_user_: User name

-_password_: User's password

_Returns_: Promise containing object.

```javascript
{
  ok: true, //value of response ok
  status: 200, // value of response status
  token: '...' // auth token
}
```

_Example:_

```javascript
const response = await signalk.connect(myserver, 80, false);

// ** login
const response = await signalk.validate();
```

---

`logout()`

Log out the current user.

_Returns_: Promise<boolean> true= success, false= failure.

---

`isLoggedIn(): Promise<boolean>`

Returns true if user is logged in.

---

### APPLICATION DATA:

Signal K servers with security enabled allow client applications to store data
using the `applicationData` API path.

Applications can store data either per user using the `user` path or globally
using the `global` path:

Use the following methods to interact with the `applicationData` API path.

See [SignalK.org](http://signalk.org) for details.

---

`setAppId(appId)`

Set the application id used for all subsequent `applicationData` actions.

This value will be used if `appId` is not supplied to a called method.

_Parameters:_

-_appId_: string value representing the application id.

_Example:_

```javascript
signalk.setAppId("myapp");
```

---

`setAppVersion(version)`

Set the version used for all subsequent `applicationData` actions.

This value will be used if `version` is not supplied to a called method.

_Parameters:_

-_version_: string value representing the version of the data stored on the
server.

_Example:_

```javascript
signalk.setAppVersion("1.1");
```

---

`appDataVersions(context, appId)`

Return a list of versions under which data is stored for the supplied context.

_Parameters:_

-_context_: `user` or `global`. If not supplied defaults to `user`.

-_appId_: string value representing the application id. If not supplied the
value set by `setAppId()` is used.

_Returns_: Promise

_Example:_

```javascript
signalk.appDataVersions("user", "myapp");
```

---

`appDataKeys(path, context, appId, version)`

Return a list of keys stored under the path which data is stored for the
supplied context, appId and version.

_Parameters:_

-_path_: pointer to the JSON key.

-_context_: `user` or `global`. If not supplied defaults to `user`.

-_appId_: string value representing the application id. If not supplied the
value set by `setAppId()` is used.

-_version_: string value representing the stored data version. If not supplied
the value set by `setAppVerison()` is used.

_Returns_: Promise.

_Example:_

```javascript
signalk.appDataKeys("vessel/speed", "user", "myapp", "1.0");
```

---

`appDataGet(path, context, appId, version)`

Return the value stored at the supplied path for the supplied context, appId and
version.

_Parameters:_

-_path_: pointer to the JSON key.

-_context_: `user` or `global`. If not supplied defaults to `user`.

-_appId_: string value representing the application id. If not supplied the
value set by `setAppId()` is used.

-_version_: string value representing the stored data version. If not supplied
the value set by `setAppVerison()` is used.

_Returns_: Promise.

_Example:_

```javascript
signalk.appDataGet("vessel/speed", "user", "myapp", "1.0");
```

---

`appDataSet(path, value, context, appId, version)`

Store a value at the supplied path for the supplied context, appId and version.

_Parameters:_

-_path_: pointer to the JSON key under which to store the data.

-_value_: value to store.

-_context_: `user` or `global`. If not supplied defaults to `user`.

-_appId_: string value representing the application id. If not supplied the
value set by `setAppId()` is used.

-_version_: string value representing the stored data version. If not supplied
the value set by `setAppVerison()` is used.

_Returns_: Promise.

_Example:_

```javascript
signalk.appDataSet("vessel/speed/sog", 1.5, "user", "myapp", "1.0");
```

---

`appDataPatch(value, context, appId, version)`

Add / Update / Remove multiple values at the supplied path for the supplied
context, appId and version.

_Parameters:_

-_value_: Array of JSON Patch formatted objects representing the actions and
values.

-_context_: `user` or `global`. If not supplied defaults to `user`.

-_appId_: string value representing the application id. If not supplied the
value set by `setAppId()` is used.

-_version_: string value representing the stored data version. If not supplied
the value set by `setAppVerison()` is used.

_Returns_: Promise.

_Example:_

```javascript
signalk.appDataPatch(
  [
    { "op": "add", "path": "/vessel/speed", "value": { sog: 1.25 } },
    { "op": "remove", "path": "/vessel/speed/stw" },
  ],
  "user",
  "myapp",
  "1.0",
);
```

---
