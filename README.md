# WSE + Cross-server Controller
Cheap and simple node.js ws ballancer/controller. With auth. And websocket. And customizable messaging protocol. And ability to communicate between server instances. And ability to run different types of instances. On different physical servers, if you want.

Look at [``wse``](https://www.npmjs.com/package/wse) before you start.

## Why?
If you need to route your clients between your servers or game instances with some very specific rules and move user between instances at any moment of time for reason your are not clearly understand.

## Okay, how it looks?
``master`` - main process with known host/port. So, demons and users connecting here first.
``demon`` - Process that always running on some server.
``core`` - Child process. It can be room, level, or game session. When core started – it also starting with websocket server on port, that automatically selected by demon before. And demon also report about this host/port to master. So, master know how user can connect to each core. Demon start cores, when master ask for it.

**How exactly?**
 ~ There is an example + vue template for it - *https://github.com/vovchisko/wse-cc-template* It's outdated for sure.

#### Oh, you still here..

I didn't expect it :3

Well, if you have any questions - ping me on [twitter](https://twitter.com/vovchisko) or github. Will be happy to help.
