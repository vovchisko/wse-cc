const WseServer = require('wse').WseServer;
const {_isf, _f} = require('./shared');

class WseCCCore extends WseServer {
    constructor(on_auth, wse_protocol) {
        let _args = {};
        for (let i in process.argv) {
            let part = process.argv[i].split('=');
            if (part.length === 2) _args[part[0]] = part[1];
        }

        super({port: _args.port}, on_auth, wse_protocol);

        this.id = _args.id;
        this.args = _args;
        this.props = {};


        process.on('disconnect', () => {
            this.log('OH MY GOSH! PARENT DISCONNECTED!');
            process.exit(0);
        });

        process.on('message', (msg) => {
            let f = _isf(msg.c);
            if (f) {
                if (typeof this[f] === 'function') {
                    console.log('func:', f, msg.dat);
                    return this[f](msg.dat);
                } else {
                    console.log(f, 'is not a function', msg.dat);
                }
            } else {
                this.emit('message', msg.c, msg.dat);
            }
        });

    }

    get_ready() {
        this.ipc(_f('_core_ready'), this.args);
    }

    _stop(dat) {
        this.log(' _stop from demon', dat);
        process.exit(0);
    }

    // anything sent by this will be re-sent to masterm if it's not special demon command.
    ipc(c, dat) {
        process.send({c, dat});
    }

    prop(key, val = undefined) {
        if (val === undefined) {
            delete this.props[key];
        } else {
            this.props[key] = val;
        }
        this.ipc(_f('_core_props'), this.props);
    }

}

module.exports = WseCCCore;
