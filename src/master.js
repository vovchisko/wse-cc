const { WseServer, WSE_REASON } = require('wse')
const { _isf, _f } = require('./shared')

const CORE_NULL = 'null' // nothing happens, no demon
const CORE_REQUESTED = 'requested' // spawn request sent
const CORE_RUNNING = 'running' // core running normally
const CORE_DETACHING = 'detaching' // detaching request sent
const CORE_DESPAWN = 'despawn' // despawn request sent
const CORE_FALLEN = 'falled' // core-falled -  not used yet

class WseCCMaster extends WseServer {
  //no master can listen for users just like wse do
  constructor (ws_params, on_auth, custom_protocol) {
    super(ws_params, on_auth, custom_protocol)

    this.emit_message_prefix = 'u:'
    this.emit_core_prefix = 'c:'
    this.emit_demon_prefix = 'd:'
    this.cores = {}

    // todo: do we need to tell cores about it?
    // this.on('leave', (client, code, reason) => { });
  }

  lead (client_id, core_id) {
    let client = this.clients[client_id]

    // err?
    if (!client) return this.log('client not exists: ' + client_id)

    if (client.core_id) {
      this.send2core(client.core_id, _f('_kick'), { client_id: client.id, reason: 'lead' })
    }

    let core = this.cores[core_id]
    if (!core) return this.log('core not exists: ' + core_id)
    let demon = this.demons[core.demon_id]
    if (!demon) return this.log('demon for ' + core_id + ' not exists')

    client.core_id = core.id
    client.core_respond = null

    client.send(_f('_lead'), { core: core.id, addr: demon.conn.pub_host + ':' + core.port })
  }

  send2core (core_id, c, dat) {
    let core = this.cores[core_id]
    if (!core) throw new Error('core not exists: ' + core_id)
    let demon = this.demons[core.demon_id]
    if (!demon) throw new Error('demon for ' + core_id + ' not exists')

    demon.send(_f('_to_core'), { core_id: core_id, c: c, dat: dat })

  }

  sys_info () {
    let demons = []
    for (let id in this.demons)
      demons.push({
        id: id,
        load: this.demons[id].load,
        ip: this.demons[id].conn.remote_addr,
      })

    let cores = []
    for (let id in this.cores)
      cores.push(this.cores[id])


    return { demons, cores }
  }

  listen_demons (ws_params, on_demon_auth, custom_protocol) {
    let handled_auth = !!on_demon_auth
    if (!on_demon_auth) {
      on_demon_auth = (id, resolve) => {
        //todo: not safe auth for demons
        resolve(id)
      }
    }

    this.wsed = new WseServer(ws_params, on_demon_auth, custom_protocol)
    this.demons = this.wsed.clients //alias to demons connections

    // NEW DEMON JOINED
    this.wsed.on('join', (demon) => {
      demon.load = 0
      this.log('new demon:', demon.id, 'safe:' + handled_auth)
      this.emit('stat', this.sys_info())
    })

    // DEAMON IS DEAD
    this.wsed.on('leave', (demon) => {
      for (let i in this.cores) {
        if (this.cores[i].demon_id === demon.id) {
          this._core_stop(demon, { id: this.cores[i].id, code: -1, signal: 'DEMON_FALL' })
        }
      }
      setTimeout(() => this.emit('stat', this.sys_info()), 20)
    })

    // DEMON TALKING (only via functions)
    this.wsed.on('message', (demon, c, dat) => {
      let f = _isf(c)
      if (f) {
        if (typeof this[f] === 'function') {
          this.log(demon.id, f, dat)
          this[f](demon, dat)
        } else {
          this.log(f, 'is not a function', dat)
        }
      } else {
        if (!this.emit(this.emit_demon_prefix + c, demon.id, dat) && this.emit_messages_ignored)
          this.emit(this.emit_demon_prefix + '_ignored', demon.id, c, dat)
      }
    })

    this.wsed.init()
  }

  _core_start (demon, co) {
    this.cores[co.id].port = co.port
    this.cores[co.id].state = CORE_RUNNING
    this.emit('c:_stop', co.id)
    this.emit('stat', this.sys_info())
  }

  _core_stop (demon, co) {

    let core = this.cores[co.id]
    if (!core) throw new Error('stopped core not even exists: ' + co.id)

    core.port = null
    core.ready = false
    core.falls = co.falls

    // in this case demon will remove all cores and reconnect later
    if (core.state === CORE_DETACHING || co.signal === 'DEMON_FALL' || co.signal === 'REJECTED') {
      core.demon_id = null
      core.state = CORE_NULL
    }

    // in this case core shoule be removed from cores list
    if (core.state === CORE_DESPAWN) {
      delete this.cores[co.id]
    }

    this.emit('c:_stop', co.id)
    this.emit('stat', this.sys_info())
  }

  _core_ready (demon, co) {
    let core = this.cores[co.id]
    if (!core) throw new Error(' _core_ready: core not even exists: ' + co.id)
    core.ready = true
    this.emit('c:_ready', co.id)
    this.emit('stat', this.sys_info())
  }

  _core_channel (demon, dat) {
    if (!this.emit(this.emit_core_prefix + dat.c, dat.core, dat.dat) && this.emit_messages_ignored)
      this.emit(this.emit_core_prefix + '_ignored', dat.core, dat.c, dat.dat)
  }

  _core_props (demon, co) {
    let core = this.cores[co.id]
    if (!core) throw new Error(' _core_props: core not even exists: ' + co.id)

    core.props = co.props
    this.emit('stat', this.sys_info())

  }

  distribute_cores (how_many = 1) {
    let distributed = 0
    for (let cid in this.cores) {
      let core = this.cores[cid]
      if (core.state === CORE_NULL || core.state === CORE_FALLEN) {
        this.attach_core(cid)
        if (++distributed >= how_many) return
      }
    }
  }

  attach_core (core_id, demon_id = null) {
    setTimeout(() => this.emit('stat', this.sys_info()), 10)

    let demon = null
    if (demon_id) demon = this.demons[demon_id]
    if (!demon_id) demon = this.best_demon()


    if (!demon) return // this.log('no demons available ', demon_id || '(any best demon) for', core_id);

    let core = this.cores[core_id]
    if (!core) throw new Error('invalid core ID:' + core_id)

    if (core.state === CORE_NULL) {
      demon.send(_f('_core_spawn'), { id: core.id, cmd: core.cmd, args: core.args })
      core.state = CORE_REQUESTED
      core.demon_id = demon.id
      demon.load++
    } else {
      this.log('core already attached:', core_id, 'on', core.demon_id)
    }
  }

  spawn_core (id, cmd, args) {
    if (this.cores[id]) throw new Error(`Core '${id}' already spawned!`)

    let core = this.cores[id] = {
      id: id,
      state: CORE_NULL,
      demon_id: null,
      port: null,
      ready: false,
      cmd: cmd,
      args: args,
      props: {},
    }

    this.attach_core(core.id)

    return core
  }

  despawn_core (id, deadly = true) {
    if (!this.cores[id]) throw new Error(`Unable to terminate core '${id}' not exists`)

    let core = this.cores[id]

    core.state = deadly ? CORE_DESPAWN : CORE_DETACHING

    if (core.demon_id) {
      this.demons[core.demon_id].send(_f('_core_despawn'), { id })
    } else {
      core.state = CORE_NULL
      if (deadly) delete this.cores[id] //just remove it
    }
  }

  best_demon () {
    let best_demon = null
    for (let id in this.demons) {
      if (this.demons[id].load === 0) return this.demons[id]
      if (best_demon === null) best_demon = id
      if (this.demons[id].load < this.demons[best_demon].load)
        best_demon = id
    }
    if (best_demon) return this.demons[best_demon]
    return null
  }
}


module.exports = WseCCMaster
