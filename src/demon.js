const child_process = require('child_process')
const os = require('os')
const net = require('net')

const PORT_UNKNOWN = 'unknown'
const PORT_FREE = 'free'
const PORT_LOCKED = 'locked'

const TASK_DESPAWN = 'despawn'
const TASK_RUN = 'run'

const { WSE_REASON, WseClient } = require('wse')

const { _isf, _f } = require('./shared')

class WseCCDemon extends WseClient {
  constructor (url, options, wse_protocol) {
    super(url, options, wse_protocol)

    this.id = null
    this._payload = null
    this._params = null

    this.ports_range = [ 4300, 4400 ]
    this.ports = {}
    this.re_connect_time = 5000
    this.log_f_calls = false

    for (let i = this.ports_range[0]; i < this.ports_range[1]; i++)
      this.ports[i] = { port: i, state: PORT_UNKNOWN, by: null, err: null }

    this.cores = {}
    this._connect_attempts = 0

    this.on('open', () => {
      this.log(`online! (att: ${ this._connect_attempts + 1 })`)
      this._connect_attempts = 0
    })

    this.on('close', (code, reason) => {
      this.force_stop()
      if (!this._connect_attempts) this.log('offline')
      this._connect_attempts++
      setTimeout(() => this.connect(this._payload, this._params), this.re_connect_time)
    })


    this.on('message', (c, dat) => {
      let f = _isf(c)
      if (f) {
        if (typeof this[f] === 'function') {
          if (this.log_f_calls) this.log(c, dat)
          return this[f](dat)
        } else {
          this.log(c, 'is not a function', dat)
        }
      }
    })
  }

  force_stop () {
    for (let i in this.cores) {
      this.cores[i].task = TASK_DESPAWN
      this.cores[i].stop(true)
    }
  }

  port_check (port) {
    let p = this.ports[port]
    if (!p) throw new Error('checking port out of range! port:' + port)

    p.state = PORT_LOCKED //because we checking it.

    return new Promise(function (resolve, reject) {
      let n = net.createServer()
      n.once('error', function (err) {
        p.state = PORT_LOCKED
        p.err = err.code
        return resolve(false)
      })
      n.once('listening', function () {
        n.once('close', function () {
          p.state = PORT_FREE
          if (p.by) p.by = null
          if (p.err) p.err = null
          resolve(true)
        })
        n.close()
      })
      n.listen(port)
    })
  }

  async reserve_core_port (core_id) {
    for (let p in this.ports) {
      if (this.ports[p].state !== PORT_LOCKED) {
        if (await this.port_check(p)) {
          this.ports[p].state = PORT_LOCKED
          this.ports[p].by = core_id
          return this.ports[p].port
        }
      }
    }
    return null
  }

  release_core_port (core_id) {
    let core = this.cores[core_id]
    let p = this.ports[core.port]

    if (!p || !core || p.by !== core.id) this.log('core ports mess: ', core, p)

    p.state = PORT_UNKNOWN
    p.by = null
    core.port = null
  }

  _to_core (message) {
    let core = this.cores[message.core_id]
    if (!core) throw new Error('invalid core_id in _to_core - ' + message.core_id)
    core.send(message.c, message.dat)
  }

  _core_spawn (core) {
    if (this.cores[core.id]) throw new Error('core already exists: ' + core.id)
    this.reserve_core_port(core.id)
        .then((port) => {
          if (!port) return this.send(_f('_core_stop'), { id: core.id, signal: 'REJECTED' })

          core.port = port

          this.cores[core.id] = new DemonCore(this, core)
        })
  }

  _core_despawn (dat) {
    this.cores[dat.id].task = TASK_DESPAWN
    this.cores[dat.id].stop()
  }

  connect (payload, params) {
    this.id = payload.id
    this._payload = payload
    this._params = params
    super.connect(this._payload, this._params)
    return this
  }

  log () {
    console.log(this.id, ...arguments)
  }
}


class DemonCore {
  constructor (demon, core) {
    this.id = core.id
    this.demon = demon
    this.port = core.port
    this.child = null
    this.task = TASK_RUN
    this.args = core.args
    this.cmd = core.cmd
    this.ready = false
    this.falls = 0
    this.props = {}
    this.debug_port = null

    this.run()
  }

  log () {
    this.demon.log('/' + this.id, ...arguments)
  }

  stop () {
    //todo: let instance to suicide normally
    if (this.child) {
      this.child.kill()
    } else {
      this.onexit(null, null)
    }
  }

  send (c, dat) {
    if (this.child === null) return false
    this.child.send({ c, dat })
  }

  run () {
    let cmd_args = []
    cmd_args.push('id=' + this.id)
    cmd_args.push('port=' + this.port)
    for (let i in this.args) cmd_args.push(i + '=' + this.args[i])

    if (this.args && this.args.debug) {
      if (this.args.debug === true) {
        this.debug_port = `9${ this.port.toString().substr(1) }`
      } else {
        this.debug_port = this.args.debug
      }
      this.log(`core ${ this.id } starting in debug mode and waiting for debugger! port:${ this.debug_port }`)
    }

    this.child = child_process.fork(this.cmd, cmd_args, {
      silent: true,
      execArgv: this.debug_port ? [ `--inspect-brk=${ this.debug_port }` ] : [],
    })


    this.child.on('exit', (code, signal) => this.onexit(code, signal))
    this.child.on('message', (data) => this.onmessage(data))

    // pipes
    this.child.stdout.on('data', (data) => process.stdout.write('[' + this.id + '].STD ' + data))
    this.child.stderr.on('data', (data) => process.stdout.write('[' + this.id + '].ERR ' + data))

    this.demon.send(_f('_core_start'), { id: this.id, port: this.port })
  }

  onexit (code, signal) {
    if (code) this.falls++
    this.demon.send(_f('_core_stop'), { id: this.id, falls: this.falls })
    this.child = null
    if (this.task === TASK_DESPAWN) {
      this.demon.release_core_port(this.id)
      delete this.demon.cores[this.id]
    } else {
      this.run()
    }
  }

  _core_ready (dat) {
    this.ready = true
    this.demon.send(_f('_core_ready'), { id: this.id, port: this.port })
  }

  _core_props (props) {
    this.props = props
    this.demon.send(_f('_core_props'), { id: this.id, props: this.props })
  }

  onmessage (msg) {
    let f = _isf(msg.c)
    if (f) {
      if (typeof this[f] === 'function') {
        this.log(msg.c, msg.dat)
        return this[f](msg.dat)
      } else {
        this.log(msg.c + ' is not a function', msg.dat)
      }
    } else {
      return this.demon.send(_f('_core_channel'), { core: this.id, ...msg })
    }
  }

}


module.exports = WseCCDemon
