pinus-cli
========

pinus-cli is a command-line tool for [pinus](https://github.com/NetEase/pinus).  
you can use pinus-cli to connect to pinus master and do lots of things.

##Installation
```
npm install -g pinus-cli
```
##Usage
Use pinus-cli to connect to pinus master  

```
pinus-cli -h host -P port -u username -p password  
```  

The default parameter of pinus-cli is as follows:

```  
pinus-cli -h 127.0.0.1 -P 3005 -u monitor -p monitor 
```  

After that, pinus-cli will enter repl mode. You can type 'help' for more information. 
Enjoy it:
![pinus-cli help](http://ww1.sinaimg.cn/mw690/b7bc844fgw1eaa5s16o2uj20hv0k4whw.jpg)

## Links
[user level control](https://github.com/NetEase/pinus-admin#user-level-control)  
[commands wiki](https://github.com/NetEase/pinus-cli/wiki/pinus-cli-man-page)

## License

(The MIT License)

Copyright (c) 2012-2013 NetEase, Inc. and other contributors

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
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
