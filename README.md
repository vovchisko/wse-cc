# wse-cc: WSE + Cross-server Controller

Cheap and simple node.js cross-server ballancer for ws-connected users. With auth. And websocket. And customizable messaging protocol. And ability to communicate between server instances. And ability to run different types of instances. Relatively simple. ...If nothing else helped.

Wait! Wait, wait. All this things based on [``wse``](https://www.npmjs.com/package/wse). Suspicious wrapper for ws with authorization and customizable protocol. Useful when you talking WS a lot. It looks like original WS, and even smells the same. But a little bit cooler. About 25% cooler.

Look at [``wse``](https://www.npmjs.com/package/wse) before you start.

## It is...
This package provides relatively simple system to manage game-instances with NodeJS and WebSocket.

## Before we start – who is who?
``master`` - main process with known host/port. So, demons and users connecting here.
``demon`` - Process that always running on some server. Demon start cores, when master ask for it. Killing it and proxying messages between master and server.
``core`` - Child process. It can be room, level, or game session. When core started – it also starting with websocket server on port, that automatically selected by demon before. And demon also report about this host/port to master. So, master know how user can connect to master.

## So what we got?

Master running on server1, and demon running on server2. And on server3, and 5...

Master register some game-instances, and know where it started, so can redirect user there. And user in game.

When we add new levels with ``master.spawn_core('my_instance_1')`` – master automatically send message to less loaded demon to start new core with specified ID and params. When core started – master got message.

Also for test (or for start) you can start master and demon on the same machine. It's fine.

**How?**
 ~ There is an example + vue template for it - *https://github.com/vovchisko/wse-cc-template*

**Can I use it for in game?**
 ~ *Well... yes, I guess. I'm using :3*

#### Oh, you still here..

I didn't expect it :3

Well, if you have any questions - ping me on [twitter](https://twitter.com/vovchisko) or github. Will be happy to help.
