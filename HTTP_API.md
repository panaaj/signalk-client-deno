# HTTP API Functions:

The `api` object provides methods to facilitate interaction with the Signal K
HTTP API path for the preferred api version as defined with the `version`
attribute.

_e.g. `/signalk/v1/api`_

**Note: Use the `connect()` method prior to using any of these API functions!**

[SignalKClient](README.md): Class for interacting with Signal K server

[stream](STREAM_API.md): class for interacting with Signal K STREAM API

[apps](APPS.md): class to enable interaction with applications installed on the
Signal K server.

_Follow the links for the relevant documentation._

---

[Attributes](#attributes)

- `observeResponse`

[Methods](#methods)

- `get()`
- `put()`
- `post()`
- `delete()`
- `getMeta()`
- `getSelf()`
- `getSelfId()`
- `raiseAlarm()`
- `clearAlarm()`

---

### Methods

`get(path)`

Make a request to a path relative to the Signal K server HTTP API path. _i.e.
`/signalk/v1/api`_.

_Parameters:_

- _path_: path relative to HTTP API

_Returns_: Promise

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...

// **** make HTTP API request ****
const response = await signalk.api.get('/resources/waypoints');
```

---

`put()`

Send a HTTP PUT request to a path relative to the Signal K server HTTP API path.
_i.e. `/signalk/v1/api`_.

Overloaded method enables values to be supplied in the following ways:

`put(path, value)`

_results in HTTP PUT '_<host_>/signalk/v1/api/_<path_>' {value: _<value_>}_

Note: context is set to `vessels.self` if path does not start with `vessels`.

`put(context, path, value)`

_results in HTTP PUT '_<host_>/signalk/v1/api/_<context_>/_<path_>' {value:
{_<value_>} }_

`put(context, path, key, value)`

_results in HTTP PUT '_<host_>/signalk/v1/api/_<context_>/_<path_>/_<key_>'
{value: {_<value_>} }_

_Parameters:_

- _context_: Signal K context _e.g. 'vessels._<uuid_>', 'self'_

- _path_: path to Signal K resource _(slash or dotted notation)_

- _key_: name of attribute the value is being written to

- _value_: value to be written

_Returns_: Promise<Response>

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...
const response = await signalk.api.put(
    'self',
    'environment/outside', 
    'temperature', 
    '297.4'
);
```

---

`post(path, value)`

Send a HTTP POST request to a path relative to the Signal K server HTTP API
path. _i.e. `/signalk/v1/api`_.

_Parameters:_

- _path_: path to Signal K resource _(slash or dotted notation)_

- _value_: value to be written

_Returns_: Promise<Response>

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...
const response = await signalk.api.post(
    'resource/waypoints', 
    {
        "urn:mrn:signalk:uuid:36f9b6b5-959f-46a1-8a68-82159742ccaa": {
            "position": {"latitude":-35.02577800787516,"longitude":138.02825595260182},
            "feature": {
                "type":"Feature",
                "geometry": {
                    "type":"Point",
                    "coordinates":[138.02825595260182,-35.02577800787516]
                },
                "properties":{"name":"gds","cmt":""},
                "id":""
            }
        }
    }
);
```

---

`delete(path)`

Send a HTTP DELETE request to a path relative to the Signal K server HTTP API
path. _i.e. `/signalk/v1/api`_.

_Parameters:_

- _path_: path to Signal K resource _(slash or dotted notation)_

_Returns_: Promise<Response>

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...
const response = await signalk.api.delete(
    'resource/waypoints/urn:mrn:signalk:uuid:36f9b6b5-959f-46a1-8a68-82159742ccaa'
);
```

---

`getMeta(context, path)`

Returns the metadata for the specified context and path in the Signal K tree.

_Parameters:_

- _context_: Signal K context _e.g. 'vessels._<uuid_>', 'self'_

- _path_: path to Signal K resource _(slash or dotted notation)_

_Returns_: Promise

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...

// **** Meta data request ****
const value = await signalk.api.getMeta('self', 'navigation.speedOverGround');
```

---

`getSelf()`

Returns the contents of the Signal K tree pointed to by self.

_Returns_: Promise

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...

const value = await signalk.api.getSelf();
```

---

`getSelfId()`

Returns the `uuid` of the self identity.

_Returns_: Promise

_Example:_

```javascript
// ** connect to server **
signalk.connect(...);

...

const value = await signalk.getSelfId();
```

---

### Alarms

`raiseAlarm(context, name, alarm)`

Send stream update to raise an alarm of the supplied name.

_Parameters:_

- _context_: Signal K context _e.g. 'vessels._<uuid_>', 'self'_

- _name_: String containing a name for the alarm or an AlarmType _(see AlarmType
  below)_.

- _alarm_: An `Alarm` object _(see Alarm below)_

_Returns_: Promise

_Examples:_

```javascript
signalk.api.raiseAlarm(
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

signalk.api.raiseAlarm(
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

_Returns_: Promise

_Examples:_

```javascript
signalk.api.clearAlarm('self', 'MOB');
```

---

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
        'Anchor drag alarm';,
        AlarmState.alarm,
        true, 
        true
    ) 

    signalk.api.raiseAlarm('self', 'Anchor', al);
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
