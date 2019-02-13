const {WseCCMaster, WseCCDemon, WseCCClient, WSE_REASON} = require('./node');


//
// 1 - MASTER SCRIPT
//


const CLIENTS_MASTER_PORT = 4800;
const DEMONS_PORT = 4801;


// how we authorize users on master?
async function on_player_auth(user_data, resolve) {
    console.log(user_data)
    if (!user_data || !user_data.id) return resolve(null);
    return resolve(user_data.id);
}

const master = new WseCCMaster({port: CLIENTS_MASTER_PORT}, on_player_auth);
master.name = 'MASTER';
master.logging = true;
master.emit_messages_ignored = true;
const CORE = './test_core.js';

// it's about users
master.on('join', (client) => {
    console.log('JOIN:', client.id);
    // when user connected, let's lead him to some core
    master.lead(client.id, 'core-1');
});
master.on('leave', (client, code, reason) => console.log('LEAVE:', client.id, code, reason));
master.on('d:_ignored', (client, c, dat) => { console.log('master not listen for messgae from demon >> ', client, c, dat)});
master.on('c:_ignored', (client, c, dat) => { console.log('master not listen for messgae from core >> ', client, c, dat)});
master.on('u:_ignored', (client, c, dat) => { console.log('master not listen for messgae from user >> ', client, c, dat)});

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
master.spawn_core('core-1', CORE);
master.spawn_core('core-2', CORE);
master.spawn_core('core-3', CORE);

// now tricky core - 4rd param - debug. default = false;
master.spawn_core('core-4', CORE, {params_also: 'here too'}, true);

// ready for user connections
master.init();


// or maybe we need to remove some core
setTimeout(() => master.despawn_core('core-4'), 22000);

// call this function from time to time to distribute
// new spawned cores, or if some demons fall or not connected yet.
setInterval(() => master.distribute_cores(), 1000);

//
// 2 - DEMONS SCRIPT
//

//start 2 demons. ususally one is more thta enough on one machine, beu let's start two for example
const demon1 = new WseCCDemon('ws://localhost:' + DEMONS_PORT);
//const demon2 = new WseCCDemon('ws://localhost:' + DEMONS_PORT);

// as we started 2 demons on the same machine
// ports range should be different
demon1.ports_range = [4900, 4920];
//demon2.ports_range = [4921, 4940];

demon1.connect('DEM-A', 'ULTRA-SECRET-KEY-1');
//demon2.connect('DEM-B', 'ULTRA-SECRET-KEY-2');

//
// 3 - CLIENT PART
//

// everything just like in ``wse``.
const client = new WseCCClient('ws://localhost:' + CLIENTS_MASTER_PORT);
client.on('open', (data) => console.log(' >>>> client connected!', data));
client.on('close', (code, reason) => console.log(' >>>> client disconnected!', code, reason));
client.on('message', (c, m) => console.log(' >>>> message', c, m));
client.on('error', (err) => console.log(' >>>> err', err));
client.on('lead', (core_data) => console.log(' >>>> before connection to another core', core_data));

client.core.on('open', () => console.log(' >>>> just connected to another core!!!!', client.core.id));

setTimeout(() => {
    client.connect({id: 'client-1'});
}, 2500);
