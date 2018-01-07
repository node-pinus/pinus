## Chatofpomelo

A simple chat room experiment using pomelo framework and html5.
The chat server currently runs on nodejs v0.8, and should run fine on the latest stable as well.It requires the following npm libraries:
- pomelo
- express
- crc

Both of them can be installed via 'sh npm-install.sh' (it will install a local copy of all the dependencies in the node_modules directory)

## Viewing

 * Visit [demo game github](https://github.com/NetEase/chatofpomelo) to get the source code and install it on your local machine.

## Configuration

 * The server setting (server number, host and port, etc.) can be configured in 'game-server/config/servers.json' and 'game-server/config/master.json' files.
 * Other settings (log4js etc.) also can be configured in 'game-server/config' folder.

## Deployment
Enter chatofpomelo/game-server, and run 'pomelo start' or 'node app.js' in order to start the game server.
Enter chatofpomelo/web-server, and run 'node app.js' in order to start the web server, and access '3001' port (which can be changed in 'app_express.js') to load game.

## Monitoring

Pomelo framework provides monitoring tool: AdminConsole. After game is loaded, you can access '7001' port and monitor the game information(operating-system, process, userInfo, sceneInfo, etc.).

## License

(The MIT License)

Copyright (c) 2013 NetEase, Inc. and other contributors

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OT`HER DEALINGS IN THE SOFTWARE.
