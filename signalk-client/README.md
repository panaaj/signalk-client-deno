# Signal K client

**signalk_client** is a library to facilitate communication with a Signal K
server.

It provides the following classes to interact with the Signal K `HTTP` and
`STREAM` APIs as well as exposing STREAM `Events`:

You can find the [documentation here.](https://github.com/panaaj/signalk-client-deno/blob/master/README.md)


---

## Getting started


The simplest way to get started is to connect to a Signal K server and open a
websocket to its data stream.

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

