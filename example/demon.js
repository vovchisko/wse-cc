const { WseCCDemon } = require('../node')

// where I can find my master server
const my_master_url = 'ws://localhost:4001/demons'

const demon = new WseCCDemon(my_master_url)

// ports range demon can use for cores.
demon.ports_range = [ 5000, 5100 ]

// how quickly demon will try to reconnect
// if master falls
demon.re_connect_time = 1500

//
demon.connect({
      // ID for this demon
      id: 'demom-A',

      // it's better to be very secret.
      // it's only between demon and master.
      secret: 'ULTRA-SECRET-KEY',
    },
    {
      // by default master will recognise demon's host by IPv4
      // but you can use domain instead
      pub_host: 'localhost',
    })

console.log('starting...')

demon.on('ready', (e) => {
  // you are ready!
  // now master can spawn cores using this demon
  console.log('ready', e)
})
