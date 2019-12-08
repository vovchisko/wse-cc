const WseServer = require('wse').WseServer
const { _isf, _f } = require('./shared')

class WseCCCore extends WseServer {
  constructor (ws_params, on_auth, wse_protocol) {
    let _args = {}
    for (let i in process.argv) {
      let part = process.argv[i].split('=')
      if (part.length === 2) _args[part[0]] = part[1]
    }

    if(!ws_params.server)

    super(ws_params, on_auth, wse_protocol)

    this.id = _args.id
    this.args = _args
    this.props = {}
    this.server = ws_params.server

    process.on('disconnect', () => {
      this.log('OH MY GOSH! PARENT DISCONNECTED!')
      this.emit('ipc:disconnect')
      process.exit(0)
    })

    process.on('message', (msg) => {
      let f = _isf(msg.c)

      if (f) {
        if (typeof this[f] === 'function') {
          this.log('func:', f, msg.dat)
          return this[f](msg.dat)
        } else {
          this.log(f, 'is not a function', msg.dat)
        }
      } else {
        this.emit('ipc:message', msg.c, msg.dat)
        this.emit('ipc:' + msg.c, msg.dat)
      }
    })
  }

  get_ready () {
    this.args.server.listen(this.args.port)
    this.ipc(_f('_core_ready'), this.args)
  }

  _stop (dat) {
    this.log(' _stop from demon', dat)
    process.exit(0)
  }

  _kick (dat) {
    this.drop_client(dat.client_id, dat.reason || null)
  }

  // anything sent by this will be re-sent to master if it's not special demon command.
  ipc (c, dat) {
    process.send({ c, dat })
  }

  prop (key, val = undefined) {
    if (val === undefined) {
      delete this.props[key]
    } else {
      this.props[key] = val
    }
    this.ipc(_f('_core_props'), this.props)
  }

}

module.exports = WseCCCore
