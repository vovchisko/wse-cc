const { WseClient } = require('wse')
const { _isf, _f } = require('./shared')

class WseCCClient extends WseClient {
  constructor (url, ws_params, protocol) {
    super(url, ws_params, protocol)

    this.on('message', (c, dat) => {
      let f = _isf(c)
      if (f) {
        if (typeof this[f] === 'function') {
          this[f](dat)
        } else {
          console.error('warning: unknown function ' + f, dat)
        }
      }
    })

    this._payload = null
    this.core = new WseClient('', ws_params, protocol)
  }

  connect (payload, params) {
    // remember payload for reconnect
    this._payload = payload
    this._params = params
    super.connect(this._payload, this._params)
  }

  _lead (dat) {
    if (this.core.is_online) this.core.close()
    this.core.connect(this._payload, this._params)
    this.core.emit('lead', dat)
  }
}

module.exports = WseCCClient
