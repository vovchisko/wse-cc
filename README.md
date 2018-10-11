# wse-cc: WSE + Cross-server Controller

Cheap and crazy multi-server node.js instance management ...If nothing else helped.

Wait, wait! All this things based on [``wse``](https://www.npmjs.com/package/wse). Suspicious wrapper for ws with authorization and customizable protocol. Useful when you talking WS a lot. It looks like original WS, and even smells the same. But a little bit cooler. About 25% cooler.

Look at [``wse``](https://www.npmjs.com/package/wse) before you start.

## Wait, what?
This package provides relatively simple system to manage game-instances with NodeJS and WebSocket. Let's say you have a game with bazillion rooms or levels and suddenly found that NodeJS is single thread thing. But this is the only thing you know good enough to develop your awesome MMORPG! (oh, just like me).

I saw many great balancers, WebSocket wrappers, process managers, clusters and other things to solve task like this. But NOT EXACTLY THIS.

## Before we start – who is who?
``master`` - main process with known host/port. So, demons and users connecting here.
``demon`` - Process that always running on some server. Demon start cores, when master ask for it. Killing it and proxying messages between master and server.
``core`` - Most child process, and actually game-instance. It can be room, level, or game session. When core started – it also starting with websocket server on port, that automatically selected by demon before. And demon also report about this host/port to master. So, master know how user can connect to master.

## So what we got?

Master running on server1, and demon running on server2. And on server3, and 5...

Master register some game-instances, and know where it started, so can redirect user there. And user in game.

When we add new levels with ``master.spawn_core()`` – master automatically send message to less loaded demon to start new core with specified ID and params. When core started – master got message.

Also for test (or for start) you can start master and demon on the same machine. It's fine.

**So... Can I use it for in game?**
 ~ *Well... yes, I guess. I'm using :3*

**Is it stable?**
 ~ *Nope.*

**Will you maintain this package?**
 ~ *Sure. Because I'm using it.*





## THAT POOR EXAMPLE
**BE ACCURATE! THIS IS EXTREMELY POOR EXAMPLE!**
For details look at ``./test.js``. More clear examples will come with release.

#### master.js

```JavaScript
const CLIENTS_MASTER_PORT = 4800;

// how we authorize users on master?
async function on_player_auth(user_data, resolve) {
    console.log(user_data)
    if (!user_data || !user_data.id) return resolve(null);
    return resolve(user_data.id);
}

const master = new WseCCMaster({port: CLIENTS_MASTER_PORT}, on_player_auth);
master.name = 'MASTER';
master.logging = true;
master.default_core_cmd = './test_core.js';

// it's about users
master.on('join', (client) => {
    console.log('JOIN:', client.id);
    // when user connected, let's lead him to some core
    master.lead(client.id, 'core-1');
});
master.on('leave', (client, code, reason) => console.log('LEAVE:', client.id, code, reason));

// how we authorize demons? let's just use id. for example.
// but remember - demon can be started on another machine.
function on_demon_auth(data, resolve) {
    // you can pass any data in secret,
    // so you know that it is your well known demon
    if (!data.secret.startsWith('ULTRA-SECRET-KEY')) resolve(null);
    // so with resolve you can pass demon
    if (data.id) return resolve(data.id);
    // or not
    resolve(null);
}

// and let's wait for demons.
master.listen_demons({port: DEMONS_PORT}, on_demon_auth);

// start new cores
master.spawn_core('core-1');
master.spawn_core('core-2', null, {somaparams: 'here'});
master.spawn_core('core-3');
master.spawn_core('core-4', './another.js', {params_also: 'here too'});

// ready for user connections
master.init();

// or maybe we need to remove some core
setTimeout(() => master.despawn_core('core-4'), 2000);

// call this function from time to time to distribute
// new spawned cores, or if some demons fall or not connected yet.
setInterval(() => master.distribute_cores(), 1000);

```


#### demon.js - you can start it on server1 on server2
```JavaScript
const DEMONS_PORT = 4801;

// start 2 demons. ususally one is more thta enough on one machine,
// but let's start two for example
const demon1 = new WseCCDemon('ws://localhost:' + DEMONS_PORT);
const demon2 = new WseCCDemon('ws://localhost:' + DEMONS_PORT);

// as we started 2 demons on the same machine
// ports range should be different
demon1.ports_range = [4900, 4920];
demon2.ports_range = [4921, 4940];

demon1.connect('DEM-A', 'ULTRA-SECRET-KEY-1');
demon2.connect('DEM-B', 'ULTRA-SECRET-KEY-2');

```

#### test_core.js - demon will start it when master commands
```JavaScript
const {WseCCCore, WSE_REASON} = require('./node');

async function on_player_auth(user_dat, resolve) {
    if (!user_dat || !user_dat.id) return resolve(null);
    return resolve(user_dat.id);
}

const core = new WseCCCore(on_player_auth);

// register ws-server for clients on port, that demon selected automatically.
core.init();

// say to demon and master that this core is ready.
core.get_ready();

// core work just like regular WseServer
core.on('message', (client, c, dat) => console.log('>> message: ', client.id, c, dat));
core.on('join', (client) => console.log('>> join:', client.id));
core.on('leave', (client, code, reason) => console.log('>> leave:', client.id, code, reason));

console.log('MY ID IS:', core.id);

let tick = 0;
setInterval(() => {
    // you can use prop to pass core properties to master
    core.prop('tick', ++tick);
    core.ipc('to_master', {rnd: Math.random()})
}, 1000 + Math.floor(Math.random() * 2000));

```

#### client.js - for browser or node client
```JavaScript
// everything just like "wse" module
const client = new WseCCClient('ws://localhost:' + CLIENTS_MASTER_PORT);
client.on('open', () => console.log(' >>>> client connected!'));
client.on('close', (code, reason) => console.log(' >>>> client disconnected!', code, reason));
client.on('message', (c, m) => console.log(' >>>> message', c, m));
client.on('error', (err) => console.log(' >>>> err', err));
client.on('lead', (core_data) => console.log(' >>>> lead to core', core_data));

client.core.on('open', () => console.log('just connected to another core!!!!', client.core));

setTimeout(() => {
    client.connect({id: 'client-1'});
}, 2500);
```

#### Oh, you still here..

I didn't expect it :3

Well, if you have any questions - ping me on [twitter](https://twitter.com/vovchisko) or github. Will be happy to help.
