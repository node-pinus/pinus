概述
==========

命令行工具pinus是Pinus框架提供的一个小工具，该工具能够帮助开发者更便捷、更有效率地进行应用开发。该工具包括的命令支持绝大多数的应用开发操作，包括创建初始项目、启动应用、停止应用、关闭应用等。用户可以通过pinus --help命令查询相关命令及其使用说明。

命令行安装
===========

当使用如下命令安装Pinus的时候，pinus会自动安装在相应的bin目录下:

    $ npm install pinus -g


命令介绍
=========

目前pinus支持如下命令及选项:

* init: 创建一个新项目，该项目中包含创建pinus应用的基本文件及pinus应用的简单示例。
* start: 启动应用及服务器。
* list: 列出当前应用开启的所有服务器的信息，包括服务器Id、服务器类型、pid、堆使用情况、启动时长。
* stop: 关闭应用及服务器或者停止指定的服务器。
* kill: 强制关闭应用及服务器。
* add: 运行时动态添加服务器。
* masterha: 当启用masterha高可用的时候，用来启动master服务器的slave节点。
* --version：列出当前使用pinus的版本信息。
* --help：列出所有pinus支持的命令及使用说明。


## 命令使用说明

* init 

根据给出的路径或文件名创建新项目，支持相对路径和绝对路径。默认情况下为当前路径，项目名称为当前文件夹名称,命令如下：

    pinus init [dirname]

在创建新项目时，需要选择新项目使用的与客户端通信时使用的connector,1 代表 Websocket(native socket), 2 代表socket.io。当当前目录下有同名文件夹存在时，会提示是否覆盖，还是取消创建。

* start

该命令用来启动Pinus应用，命令格式如下:

    pinus start [-e,--env <env>] [-d,--directory <code directory>]
                 [-D,--daemon]

其中，-e 用来选择启动时使用的env，如production，development，stress-test等; -d 用来指定项目目录； -D 用来开启daemon模式启动，如果开启了daemon，那么进程将转入后台运行, 所有的日志将不再打印到console上，只能通过对应的日志文件查看日志。在0.7及以前的版本中，对于env的使用，没有使用-e选项，而是直接作为一个参数来使用的，这里需要注意一下。

用户可以在<project_dir>/game-server/config/servers.json中为不同的服务器中添加不同参数，这些参数是node和v8支持的参数，是用来指定和影响node及v8的行为的。例如，当我们想对某一个服务器开启调试的时候，就可以在服务器配置中，增加args配置项，并在args中配置开启调试的端口等，示例如下:

```json
{"connector":[{"id":"connector-server-1", "host":"127.0.0.1", "port":4050, 
"clientPort":3050, "args":"--debug=[port]"}]}
```

* list

当应用启动后，该命令列出所有服务器信息。由于当执行此操作时，pinus是作为监控管理框架的一个客户端的，在连接注册到master上的时候，需要进行身份验证。默认生成的项目中，有一个默认的用户名admin，口令也为admin，因此在不指定用户名和口令的时候，默认使用的用户名和口令均为admin，下面的stop命令和kill命令均需要使用用户名和口令验证，默认值与此处相同。应用的管理用户可以通过修改config/adminUser.json文件进行配置,具体的配置格式可以参考pinus init生成的项目中的相关配置。

执行本命令时，还需要指定master服务器的ip和port, 这样可以是的pinus list可以在任意地方执行。pinus stop/kill/add等也同样需要指定master服务器的ip和port，默认使用127.0.0.1:3005作为master服务器的地址。

命令格式如下: 

     pinus list [-u,--username <username>] [-p,--password <password>]
                 [-h,--host <master-host>] [-P,--port <master-port>]

* stop 

stop用来停止当前应用，优雅地关闭应用。和kill命令不同，这种关闭首先会切断客户端与服务器的连接，然后逐一关闭所有服务器。如果指定了服务器serverId的话，则会关闭特定的服务器，而不是关闭所有的服务器。与list命令一样，需要权限验证，默认的用户名和密码均为admin,也需要指定master服务器的位置, 跟pinus list一样，默认使用127.0.0.1:3005。

命令格式如下:
    
     pinus stop [-u,--username <username>] [-p,--password <password>]
                 [-h,--host <master-host>] [-P,--port <master-port>]
                 [<serverIds>...]

* kill 

该命令强制关闭应用。在本地进行应用开发过程中，如果遇到kill之后还有服务器进程没有关闭的情况，可以增加--force选项，强制关闭所有服务器进程。该操作相当地暴力，可能产生数据丢失等不好的影响，可以在开发调试时使用，不推荐在线上使用该命令。该命令同样也需要进行身份验证以及指定master服务器的位置，具体方式同list和stop。

该命令需在项目的根目录或game-server下使用，命令格式如下:

     pinus kill [-u,--username <username>] [-p,--password <password>]
                 [-h,--host <master-host>] [-P,--port <master-port>]
                 [-f,--force]

* add

该命令用来运行时动态增加服务器，与pinus list等命令类似，pinus add也需要身份验证以及指定master服务器的地址。具体命令格式如下:

     pinus add [-u,--username <username>] [-p,--password <password>]
                [-h,--host <master-host>] [-P,--port <master-port>]
                [<server-args>...]

args参数是用来指定新增服务器的参数的，包括服务器类型，服务器id等， 支持一次增加一台或多台同类型的服务器，例子如下：

     pinus add host=127.0.0.1 port=8000++ clientPort=9000++ frontend=true clusterCount=3 serverType=connector 
     pinus add host=127.0.0.1 port=8000 clientPort=9000 frontend=true serverType=connector id=added-connector-server

* masterha

当启用了master服务器的高可用后，该命令用来启动master服务器的slave节点，需要在game-server/config目录下配置masterha.json。其他的命令行参数类似于pinus start，格式如下：

    pinus masterha [-d,--direcotry <code directory>]

* 其他

查看当前Pinus的版本时，可以使用如下命令:
    
    pinus --version

查看pinus命令行工具的帮助时，可以使用如下命令:

    pinus --help
    pinus add --help
    pinus start --help

* 注:

一般来说在开发环境中，master服务器的地址会一直是127.0.0.1:3005,使用的管理用户的username和password直接使用默认的admin即可，这样的话，开发调试时，在执行具体的pinus命令的时候，maser服务器的地址信息以及管理用户信息都可以省略。
