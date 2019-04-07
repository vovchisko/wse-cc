const {WseClient} = require('wse');
const {_isf, _f} = require('./shared');

class WseCCClient extends WseClient {
    constructor(url, ws_params, protocol) {
        super(url, ws_params, protocol);

        this.on('message', (c, dat) => {
            let f = _isf(c);
            if (f) {
                if (typeof this[f] === 'function') {
                    //console.log('func:', f, dat);
                    this[f](dat);
                } else {
                    //todo: should we emit some error here?
                    //console.log('unknown function ' + f, dat);
                }
            }
        });

        this._payload = null;
        this.core = new WseClient('', ws_params, protocol); //is it legal?

    }

    connect(payload) {
        // just remember payload on first connect.
        // it will be used for core as well.
        this._payload = payload;
        super.connect(this._payload);
    }

    _lead(dat) {
        // keep in mind that this operatin might be done by the core as well.
        if (this.core.is_online) this.core.close();
        this.core.url = 'ws://' + dat.addr + '/ws-core';
        this.core.connect(this._payload); //the same payload for master and any core, right?
        this.core.emit('lead', dat);
    }
}

module.exports = WseCCClient;
