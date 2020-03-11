这是pinus的简单示例工程，包含：
1、game-server，游戏服务器
2、web-server，网页客户端的服务

启动方法：
1、执行npm-install.bat或npm-install.sh
2、编译游戏服
cd game-server
npm run build
2、启动游戏服
cd dist
node app
显示“all servers startup in xxx ms”即表示启动成功

3、启动网页服务器
cd web-server
node app
显示“Please log on http://127.0.0.1:3001/index.html”即表示启动成功

4、进入客户端网页
浏览器输入
http://127.0.0.1:3001/index.html
点击“Test Game Server”，如返回“game server is ok.”即表示连接游戏服务器返回成功


调试游戏服务器的方法：
1、安装vscode
2、在game-server目录启动vscode
3、按照正常流程启动游戏服
4、在“调试”界面，选择Attach To Connector或Attach To Master
5、按F5把调试器挂上去，然后就可以断点调试了。