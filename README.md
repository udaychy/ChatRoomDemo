# Chat Room Demo

This is a demo to show how offline app can be made simply with [JsStore][l_jsstore].
	
## Overview

In Chat Room Demo, The messages sent or received are stored locally in indexedDB using [JsStore][l_jsstore] and synced with the server in each request.

If the  user is offline or server is not responding, the messages are stored locally and these failed messages are pushed to server and 
new messages are fetched from the server whenever user goes online or server starts responding.

Two new things are introduced in this demo which you should know:

* [JsStore][l_jsstore]:
Wrapper of indexedDB which provides useful API for CURD operations on indexedDB

* [Json-server][l_jsonserver]:
It provides API for CURD operation on any json file(say db.json) which contains the data(like a Database) It run on node.js.

## Installation

### 1. Install node.js

If node.js is not installed in your system then you can get it from [here][l_nodejs].
	
### 2. Install json-server
Open the Node.js command prompt and enter the command below
	
```bash
$ npm install -g json-server
```

### 3. Clone/download the ChatRoomDemo

### 4. Start the json-server

Open the Node.js command prompt and go to the directory(ChatRoomDemo) which contains the `db.json` file. Once you are pointing to the ChatRoomDemo directory in Node.js command prompt, enter the command below
	
```bash
$ json-server --watch db.json
```
	
## Ready to go

You are now ready to open the index.html file (inside your ChatRoomDemo directory).
You can start playing with the demo by turning the json-server ON *(Installation step 4)* and OFF *(CTRL + C)*
	
	
	
[l_nodejs]: <https://nodejs.org/en/download>
[l_jsonserver]: <https://github.com/typicode/json-server>
[l_jsstore]: <http://www.jsstore.net>
