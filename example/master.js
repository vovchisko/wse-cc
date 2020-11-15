const WseCCMaster = require('../node').WseCCMaster
const server = require('http').createServer()

function on_player_auth (api_key, resolve) {
  // check if user allowed to connect
  if (api_key) {
    // accept user
    return resolve(api_key)
  }

  // or reject user
  return resolve(null)
}

function on_demon_auth (data, resolve) {
  if (data.secret === 'ULTRA-SECRET-KEY') return resolve(data.id)
  resolve(null)
}

const master = new WseCCMaster({ server }, on_player_auth)


// to make it works with SSL (WSS) turn it to `true`
// and user https module instead of http
master.use_ssl = false

// if true - master will log all interactions with demons to the console
master.logging = false


// listen for user connections
master.init(4000)

// listen for demons
master.listen_demons({ port: 4001 }, on_demon_auth)

// this event will fires everytime when system configuration changes.
// new demons appears, or cores changes/ useful for debug.
master.on('stat', (stat_data) => {
  console.log('STAT >> ',stat_data)
})

// now let's try to spawn some cores...
master.spawn_core(
    'core-id-1', // core should have ID
    './core.js', // core script to start
    { debug: false }, // pass debug port if you need
);

// now let's try to spawn some cores...
master.spawn_core(
    'core-id-2', // core should have ID
    './core.js', // core script to start
    { debug: false }, // pass debug port if you need
);


// make sure all cores is attached somewhere
// you decide when to do it
setInterval(() => master.distribute_cores(1), 200)


console.log('master is ready')
