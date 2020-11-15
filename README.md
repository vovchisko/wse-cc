# WSE + Cross-server Controller
Cheap and simple node.js ws ballancer/controller with ability to communicate between server instances. It allows to start instances on a different physical servers, if you want.

Look at [``wse``](https://www.npmjs.com/package/wse) before you start.

## Why?
If you need to manage your clients between your servers or game instances with some very specific rules and without any extra-layers or load ballancers.

## Components
* `master` - Main process with known host/port. used as registry of existing users.

* `demon` - Service process. It always running on some server. Usually only responsive for starting child processes - cores.

* `core` - Child process. It can be chat room, level, or game session. When core started – it also starting with websocket server on port, that automatically selected by demon before. And demon also report about this host/port to master. So, master know how user can connect to each core. Demon start cores, when master ask for it.

### How exactly?
 There is a simple example inside `/example` folder. But there is no `client` example yet. There is an [example + vue template](https://github.com/vovchisko/wse-cc-template) but it's might be outdated.
 
 I'm not bothering with docs too much, as this package not used by anyone but me yet :)
 
 If you need any help: ping me on [twitter](https://twitter.com/vovchisko) or github. Will be happy to help.

