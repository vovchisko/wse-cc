const {WseCCMaster, WseCCDemon, WseCCClient, WSE_REASON} = require('./node');


const CLIENTS_MASTER_PORT = 4200;
const DEMONS_PORT = 4201;
const DEFAULT_CORE_PROCESS = './test_core.js';

//
// 1 - MASTER SCRIPT
//


// how we authorize users on master?
async function on_player_auth(user_data, resolve) {
    console.log(user_data)
    if (!user_data || !user_data.id) return resolve(null);
    return resolve(user_data.id);
}

const master = new WseCCMaster({port: CLIENTS_MASTER_PORT}, on_player_auth);
master.name = 'MASTER';
master.logging = true;

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
master.spawn_core('core-1', DEFAULT_CORE_PROCESS);
master.spawn_core('core-2', DEFAULT_CORE_PROCESS);
master.spawn_core('core-3', DEFAULT_CORE_PROCESS);
master.spawn_core('core-4', DEFAULT_CORE_PROCESS);

// ready for user connections
master.init();

// or maybe we need to remove some core
setTimeout(() => master.despawn_core('core-4'), 2000);

setInterval(() => master.distribute_cores(), 200);

//
// 2 - DEMONS SCRIPT
//


// call this function from time to time to distribute
// new spawned cores, or if some demons fall or not connected yet.

//start 2 demons
const demon1 = new WseCCDemon('ws://localhost:' + DEMONS_PORT);
const demon2 = new WseCCDemon('ws://localhost:' + DEMONS_PORT);

demon1.ports_range = [4400, 4420];
demon1.cmd_line = './test_core.js';

demon2.ports_range = [4500, 4520];
demon2.cmd_line = './test_core.js';

demon1.connect('DEM-A', 'ULTRA-SECRET-KEY-1');
demon2.connect('DEM-B', 'ULTRA-SECRET-KEY-2');

//
// 3 - CLIENT PART
//

// everything just like in ``wse``.
const client = new WseCCClient('ws://localhost:' + CLIENTS_MASTER_PORT);
client.on('open', () => console.log(' >>>> client connected!'));
client.on('close', (code, reason) => console.log(' >>>> client disconnected!', code, reason));
client.on('message', (c, m) => console.log(' >>>> message', c, m));
client.on('error', (err) => console.log(' >>>> err', err));
client.on('lead', (core_data) => console.log(' >>>> before connection to another core', core_data));

client.core.on('open', () => console.log('just connected to another core!!!!', client.core));

setTimeout(() => {
    client.connect({id: 'client-1'});
}, 2500);
