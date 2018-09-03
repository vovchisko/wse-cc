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


