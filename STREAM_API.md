# STREAM API:

The `stream` object provides methods to facilitate interaction with the Signal K
STREAM API for the preferred api version as defined with the `version`
attribute.

_e.g. `/signalk/v1/stream`_

**Note: You must use any of the `connect` or `open` methods prior to calling any
of these API functions!**

[SignalKClient](README.md): Class for interacting with Signal K server

[api](HTTP_API.md): class for interacting with Signal K HTTP API

[apps](APPS.md): class to enable interaction with applications installed on the
Signal K server.

_Follow the links for the relevant documentation._

---

[Attributes](#attributes)

- `isopen`
- `connectionTimeout`
- `filter`
- `selfId`
- `playbackMode`
- `source`
- `authToken`

[Methods](#methods)

- `open()`
- `close()`
- `login()`
- `put()`
- `sendRequest()`
- `sendUpdate()`
- `send()`
- `subscribe()`
- `unsubscribe()`
- `isHello()`
- `isDelta()`
- `isResponse()`
- `isSelf()`
- `raiseAlarm()`
- `clearAlarm()`

[Events](#events)

- `connect`
- `close`
- `error`
- `message`

[Alarms](#alarms)

- `Alarm`
- `AlarmState`
- `AlarmType`

---

### Attributes

`isOpen: boolean`

Returns true if WebSocket connection is established.

---

`playbackMode: boolean`

Returns true if stream is a history playback data stream.

---

`connectionTimeout: number`

Set stream connection timeout value in milliseconds. default=20000 (20 sec).

If a connection has not been established within the specified time period the
connection attempt is aborted and an `onError` event is raised.

_Parameters:_

- _period_: Number of milliseconds to elapse before connection attempt is
  aborted.

_Valid value range is 3000 to 60000 milliseconds (3 to 60 sec)._

_Example:_

```javascript
signalk.stream.connectionTimeout= 10000;

signalk.stream.connect( ... );
```

---

`filter: string`

Use the filter attribute to only include messages with the context of the
supplied `uuid`.

_Parameters:_

- _uuid_: The `uuid` of messages to include in the `onMessage` event. Can also
  use `self` or `vessel.self`. To clear the filter set the value of `uuid` to
  `null`.

_Examples:_

```javascript
// **** see only delta messages from 'self' ****
signalk.stream.filter= 'self';
signalk.stream.filter 'vessels.self';

// **** see only delta messages from vessel with uuid= urn:mrn:signalk:uuid:c63cf2d8-eee1-43ef-aa3b-e1392cee5b7c 
signalk.stream.filter= 'urn:mrn:signalk:uuid:c63cf2d8-eee1-43ef-aa3b-e1392cee5b7c';

// **** Remove the filter ****
signalk.stream.filter= null;
```

---

`selfId: string`

Value of the Self identity returned in the WebSocket `hello` message.

---

`source: string`

Source label value to be used in messages sent to the Signal K server.

_Example:_

```javascript
signalk.stream.source= 'my-app-name';

signalk.stream.sendUpdate(....);

// ** resultant message payload **
{
    context: 'vessels.self',
    updates: [
        {
            source: {label: 'my-app-name'},
            timestamp: .....,
            values: [... ]
        }
    ]
}
```

---

`authToken: string`:

A token string to be used for authentication when interacting with the Signal K
server.

Use the `login()` method to authenticate to the server and retrieve a token for
the specified user.

_Example:_

```javascript
signalk.stream.authToken = '<auth_token_string>';
```

Once you have supplied an `authToken` it will be used for all subsequent
operations.

---

### Events

The following STREAM events are exposed for the purposes of interacting with the
Signal K delta stream:

- `connect`: Raised when WebSocket connection is made.

- `error`: Raised upon stream error.

- `close`: Raised when WebSocket connection is closed.

- `message`: Raised when a message is received on WebSocket connection.

Subscribe to these events to interact with the Signal K delta stream.

_Example:_

```javascript
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
```

---

### Methods

`open(url, subscribe, token)`

Opens Signal K server DELTA stream.

_Paramaters:_

- _url_: url of Signal K stream endpoint. If `null` or `undefined` will use the
  discovered stream endpoint url for the preferred api `version`.

- _subscribe_: Signal K subcription request value: 'all', 'self' or 'none'.
  _(Uses server default if null)_

- _token_: Authentication token.

_Returns_: true or Error(). Subscribe to `SignalKClient.stream` events to
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

// **** CONNECT to a discovered stream endpoint ****
signalk.stream.open( null, 'self');

// **** CONNECT to a specified Signal K Stream ****
signalk.stream.open( 'stream_url', 'self');
```

---

`close()`

Closes Signal K Delta stream.

---

`login(username,password)`

Authenticate user to Signal K server vai STREAM API.

_Note: The `stream` object will process the login response message and retain
the returned token for use in future requests._

_Parameters:_

- _username_: User name to authenticate

- _password_: User password.

_Returns_: The `requestId` of the put request. Use this `requestId` to determine
the status of the request from returned stream message(s).

_Example:_

```javascript
// ** connect to server **
signalk.streamOpen(...);

let reqId= signalk.stream.login("myuser", "myUserPassword");
```

---

`put(context, path, value)`

Put value to Signal K path via the Signal K server STREAM API.

_Parameters:_

- _context_: Signal K context _e.g. 'vessels._<uuid_>', 'self'_

- _path_: path to Signal K resource _(dotted notation)_. Can also be an array of
  valid Signal K subscription objects.

- _value_: value to write

_Returns_: The `requestId` of the put request. Use this `requestId` to determine
the status of the request from returned stream message(s).

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...
// **** send update to STREAM API ****
let reqId= signalk.stream.put("vessels.self", "steering.autopilot.target.headingTrue", 1.52);
```

---

`sendRequest(value)`

Send Request message via the Signal K server STREAM API.

A `requestId` is automatically generated and added to the message by the method.

This method will also detect and include an authentication token from prevous
`login()` method calls.

_Parameters:_

- _value_: Object containing the message payload.

- _path_: path to Signal K resource _(dotted notation)_. Can also be an array of
  valid Signal K subscription objects.

- _value_: value to write

_Returns_: The `requestId` of the put request. Use this `requestId` to determine
the status of the request from returned stream message(s).

_Example:_

```javascript
// ** connect to server **
signalk.streamOpen(...);

...
// **** send request to STREAM API ****
let reqId = signalk.stream.sendRequest( {
    key1: 'Key1 data.',
    key2: 'Key2 data.'
});
```

---

`sendUpdate(context, path, value)`

Send delta update via the Signal K server STREAM API.

_Parameters:_

- _context_: Signal K context _e.g. 'vessels._<uuid_>', 'self'_

- _path_: path to Signal K resource _(dotted notation)_. Can also be an array of
  valid Signal K subscription objects.

- _value_: value to write

_Returns_: Subscribe to `SignalKClient.stream` events to receive results of
actions.

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...
// **** send update to STREAM API ****
signalk.stream.sendUpdate("vessels.self", "steering.autopilot.target.headingTrue", 1.52);

signalk.stream.sendUpdate("vessels.self", [
    {path: "steering.autopilot.target.headingTrue", value: 1.52},
    {path: "navigation.speedOverGround.", value: 12.52}
]);
```

---

`send(data)`

Send data to the Signal K server STREAM API.

_Parameters:_

- _data_: Valid Signal K formatted data sent to the server.

_Returns_: Subscribe to `SignalKClient.stream` events to receive results of
actions.

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...

// **** send data to STREAM API ****
signalk.stream.send({
    "context": "vessels.self",
    "put": {
        "path": "steering.autopilot.target.headingTrue",
        "source": "actisense.204",
        "value": 1.52
    }
});
```

---

`subscribe(context, path, options?)`

Subscribe to specific Signal K paths in the delta stream.

By default the delta stream will contain all updates for vessels.self. Use the
subscribe function to specify which updates to recieve in the delta stream.

_Parameters:_

- _context_: Signal K context _e.g. 'vessels._<uuid_>', 'self'_

- _path_: path to Signal K resource _(dotted notation)_. Can also be an array of
  valid Signal K subscription objects.

- _options (optional)_: Object containing one or more of the following
  subscription options.

```javascript
{
    period: 1000, // time in milliseconds in between transmission (default: 1000)
    format: 'delta', // Transmission format 'delta' or 'full' (default: 'delta')    
    policy: 'ideal', // 'instant', 'ideal', 'fixed' (default: 'ideal'),
    minPeriod: 'instant' // Fastest transmission rate allowed. (relates only to policy= 'instant')
}
```

_Example:_

```javascript
// **** subscribe using defaults ****
signalk.stream.subscribe('self', 'navigation.courseOverGroundTrue');

// **** subscribe using some specified options ****
signalk.stream.subscribe('self', 'navigation.courseOverGroundTrue', {
  period: 2000,
});

// **** subscribe to a numbe rof paths ****
signalk.stream.subscribe('self', [
  { path: 'navigation.courseOverGroundTrue', period: 2000 },
  { path: 'navigation.speedOverGround', period: 2000 },
]);

// **** subscribe to all updates ****
signalk.stream.subscribe();
```

---

`unsubscribe(context, path)`

Unubscribe from specific Signal K paths so data for the specified path(s) are no
longer received in the delta stream.

_Parameters:_

- _context_: Signal K context _e.g. 'vessels._<uuid_>', 'self'_

- _path_: path to Signal K resource _(dotted notation)_. Can also be an array of
  valid Signal K paths.

_Examples:_

```javascript
// **** unsubscribe from specific updates ****
signalk.stream.unsubscribe('self', 'navigation.courseOverGroundTrue');

signalk.stream.unsubscribe('self', [
  'navigation.courseOverGroundTrue',
  'navigation.speedOverGround',
]);

// **** unsubscribe from all updates ****
signalk.stream.unsubscribe();
```

---

`raiseAlarm(context, name, alarm)`

Send stream update to raise an alarm of the supplied name.

_Parameters:_

- _context_: Signal K context _e.g. 'vessels._<uuid_>', 'self'_

- _name_: String containing a name for the alarm or an AlarmType _(see AlarmType
  below)_.

- _alarm_: An `Alarm` object _(see Alarm below)_

_Examples:_

```javascript
signalk.stream.raiseAlarm(
  'self',
  'Anchor',
  new Alarm(
    'Anchor dragging!',
    AlarmState.alarm,
    true,
    true,
  ),
);

// ** using special alarm type **
signalk.stream.raiseAlarm(
  'self',
  AlarmType.sinking,
  new Alarm(
    'SINKING',
    AlarmState.alarm,
    true,
    true,
  ),
);
```

---

`clearAlarm(context, name)`

Send stream update to clear the alarm of the supplied name.

_Parameters:_

- _context_: Signal K context _e.g. 'vessels._<uuid_>', 'self'_

- _name_: Alarm name e.g.MOB, Anchor.

_Examples:_

```javascript
signalk.stream.clearAlarm('self', 'MOB');
```

---

`isDelta(msg)`

Returns true if supplied message is a delta message containing updates.

_Parameters:_

- _msg_: Signal K delta message

_Returns_: boolean

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...

signalk.stream.events.on('message', (ev: MessageEvent) => {
    if( signalk.stream.isDelta(ev) ) { ... }
});
```

---

`isHello(msg)`

Returns true if supplied message is a Signal K server `hello` message.

_Parameters:_

- _msg_: Signal K delta message

_Returns_: boolean

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...

signalk.stream.events.on('message', (ev: MessageEvent) => {
    if( signalk.stream.isHello(ev) ) { ... }
});
```

---

`isResponse(msg)`

Returns true if supplied message is a Stream Request `response` message.

_Parameters:_

- _msg_: Signal K delta message

_Returns_: boolean

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...

signalk.stream.events.on('message', (ev: MessageEvent) => {
    if( signalk.stream.isResponse(ev) ) { ... }
});
```

---

`isSelf(msg)`

Returns true if supplied message context is for the `self` identity.

_Parameters:_

- _msg_: Signal K delta message

_Returns_: boolean

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...

signalk.stream.events.on('message', (ev: MessageEvent) => {
    if( signalk.stream.isSelf(ev) ) { ... }
});
```

---

### Alarms

`Alarm`

Alarm object that encapsulates an alarm message for use with `raiseAlarm()`
method.

`new Alarm(<message>, <state>, <visual>, <sound>)`

_Parameters:_

- _message_: Alarm message text
- _state_: An AlarmState value.
- _visual_: true / false
- _sound_: true / false

`value`

Attribute that returns a formatted value for use with `raiseAlarm()` method.

_Example:_

```javascript
let al= new Alarm(
    'Anchor drag alarm!;,
    AlarmState.alarm,
    true, true
) 

signalk.stream.raiseAlarm('self', 'Anchor', al);
```

---

`AlarmState`

Set of valid Signal K alarm state values.

- `normal`
- `alert`
- `warn`
- `alarm`
- `emergency`

---

`AlarmType`

Special alarm types:

- `mob`
- `fire`
- `sinking`
- `flooding`
- `collision`
- `grounding`
- `listing`
- `adrift`
- `piracy`
- `abandon`

---
