var conn = new JsStore.Instance();
var currentUserName = localStorage.UserName || "";
var messageTemplate = $("#messageTemplate").html();
var serverHomeURL = "http://localhost:3000/";
var syncInterval = 2000; // in ms
var timeOutId = 0;
//DB
var db = {};
db.getTablesSchema = function () {
    var messages = {
        Name: "messages",
        Columns: [{
            Name: "id",
            PrimaryKey: true,
            AutoIncrement: true
        },
        {
            Name: "serverId",
            NotNull: false,
            DataType: 'number'
        },
        {
            Name: "body",
            NotNull: false,
            DataType: 'string'
        },
        {
            Name: "msgBy",
            DataType: 'string'
        }
        ]
    };

    return [messages];
}
db.getStructure = function (dbName, tableSchema) {
    if (!dbName || !tableSchema) {
        alert("DB Name or Table Schema is not found while creating DB")
        return null;
    }

    return {
        Name: dbName,
        Tables: tableSchema
    }
}
db.connect = function (database) {
    JsStore.isDbExist(database.Name).
        then(function (isExist) {
            if (isExist) {
                conn.openDb(database.Name);
            } else {
                conn.createDb(database);
            }
        }).
        catch(function (err) {
            alert(err._message);
            console.log(err);
        });
}
db.clearTable = function (tableName) {
    return conn.clear(tableName)
}

db.insertMessage = function (message, messageBy, serverId) {
    return conn.insert({
        Into: "messages",
        Values: [{
            serverId: serverId || 0,
            body: message,
            msgBy: messageBy
        }],
        Return: true
    });
}
db.insertMessages = function (messages) {
    return conn.insert({
        Into: "messages",
        Return: true,
        Values: messages
    });
}
db.updateMessageServerId = function (id, serverId) {
    return conn.update({
        In: "messages",
        Set: {
            serverId: serverId
        },
        Where: {
            id: id,
        }
    });
}
db.getSentMessages = function () {
    return conn.select({
        From: "messages",
        Where: {
            serverId: { '>': 0 }
        },
        Order: {
            By: 'serverId'
        }
    });
}
db.getFailedMessages = function () {
    return conn.select({
        From: "messages",
        Where: {
            serverId: 0
        },
        Order: {
            By: 'id'
        }
    });
}

var api = {};
api.pushMessage = function (message, msgBy) {
    return $.post(serverHomeURL + "messages", { body: message, msgBy: msgBy })
}
api.getMessages = function () {
    return $.get(serverHomeURL + "messages");
}
api.pushUser = function (userName) {
    return $.post(serverHomeURL + "users", { userName: userName });
}
api.getUserByName = function (userName) {
    return $.get(serverHomeURL + "users?userName=" + userName);
}


var dom = {};
dom.appendMessageAtEnd = function (messageObj) {
    var $msgBody = $("#msgPanel").append(messageTemplate)
        .children(':last')
        .addClass(messageObj.msgBy == currentUserName ? "my-msg" : "")
        .attr("data-id", messageObj.id)
        .attr("data-serverid", messageObj.serverId)
        .children(".msg-body");

    $msgBody.text(messageObj.body)

    messageObj.serverId
        && $msgBody.siblings(".fa-clock-o")
            .removeClass("fa-clock-o")
            .addClass("fa-check");

    $msgBody.siblings(".msg-by")
        .text(messageObj.msgBy);
    
    $("#msgPanel").scrollTop($("#msgPanel")[0].scrollHeight);
}
dom.appendMessagesAtEnd = function (msgs) {
    $.each(msgs, function (i, msg) {
        dom.appendMessageAtEnd(msg)
    });
}
dom.markMessageAsSent = function (messageObj) {
    var $msg = $("#msgPanel").children("[data-id='" + messageObj.id + "'], [data-serverid='" + messageObj.serverId + "']");
    $msg.children(".fa-clock-o")
        .removeClass("fa-clock-o")
        .addClass("fa-check");
}
dom.setInitalView = function () {
    if (currentUserName) {
        $("#userName").text(currentUserName);
        $("#divStartChat").hide();
    } else {
        $("#divStartChat").show();
    }
}


var pushFailedMessages = function (msgs) {
    $.each(msgs, function (i, msg) {
        api.pushMessage(msg.body, currentUserName)
            .done(function (res) {
                db.updateMessageServerId(msg.id, res.id)
                dom.markMessageAsSent({
                    id: Number(msg.id),
                    serverId: Number(res.id),
                    body: msg.body,
                    msgBy: msg.msgBy
                });
            })
            .fail(function () {
                console.log("failed messsge push again failed");
            });
    });
}

var displayLocalDbMessages = function(){
    $("#msgPanel").html("");
    db.getSentMessages().then(function (msgs) {
        dom.appendMessagesAtEnd(msgs);
        db.getFailedMessages().then(function (unpushedMsgs) {
            $.each(unpushedMsgs, function (i, msg) {
                dom.appendMessageAtEnd(msg);
            });
        })
    });
}

var setIntervalPromise = function(functionName, interval){
    var recursiveCall = function(){
        timeOutId = setTimeout(function(){
          setIntervalPromise(functionName, interval);
      }, interval);
    }

    functionName().done(recursiveCall).fail(recursiveCall);
}

var filterNewMsgs = function(serverMsgs, localMsgs){
    localMsgIds = $.map(localMsgs, function (msg) {
        if (msg.serverId > 0) return msg.serverId;
    });
    return $.map(serverMsgs, function(sMsg){
            if(localMsgIds.indexOf(sMsg.id) == -1){
                return {
                    serverId: Number(sMsg.id),
                    body: sMsg.body,
                    msgBy: sMsg.msgBy
                }
              }
    });
}

var syncMessages = function () {
    return api.getMessages().done(function (allMsgs) {
        db.getSentMessages().then(function (pushedMsgs) {
            db.getFailedMessages().then(function (unpushedMsgs) {
                unpushedMsgs.length > 0 && pushFailedMessages(unpushedMsgs);
            });
            db.insertMessages(filterNewMsgs(allMsgs, pushedMsgs)).then(function (insertedMsgs) {
                dom.appendMessagesAtEnd(insertedMsgs);
            });
        });
    }).fail(function () {
        console.log("unable to sync");
    });
}

var eventHandler = {};
eventHandler.pushMessage = function (e) {
    var msg = $("#msgBox").val();
    $("#msgBox").val("");
    api.pushMessage(msg, currentUserName).done(function (res) {
        db.insertMessage(res.body, res.msgBy, Number(res.id))
            .then(function (msg) {
                dom.appendMessageAtEnd(msg[0]);
            });

    }).fail(function () {
        db.insertMessage(msg, currentUserName, 0)
            .then(function (msgObj) {
                msgObj.length > 0 && dom.appendMessageAtEnd(msgObj[0]);
            });
    })
};
eventHandler.addUser = function (e) {
    var userName = $("#userInput").val();
    api.getUserByName(userName)
        .done(function (res) {
            $("#divStartChat").hide();
            $("#userInput").val('');
            $("#userName").text(userName);

            if (res.length) {
                localStorage.UserName = currentUserName = res[0].userName;    
                return;
            }

            api.pushUser(userName).done(function (res) {
                localStorage.UserName = currentUserName = res.userName;
            }).fail(function () {
                $("#divStartChat").show();
                alert("server not responding... Try again")
            });
        }).fail(function () {
            alert("server not responding... Try again")
        });

}
eventHandler.exitChat = function(){
    localStorage.clear();
    currentUserName = "";
    clearTimeout(timeOutId);
    dom.setInitalView();
}

$(function () {
    db.connect(db.getStructure("MyDb", db.getTablesSchema()));

    dom.setInitalView();
    if(currentUserName){
        displayLocalDbMessages();
        setIntervalPromise(syncMessages, syncInterval);
    } 
    
    $(document).on("click", "#btnSendMsg", eventHandler.pushMessage)
        .on("keyup", "#userInput", function (e) {
            if((e.keyCode || e.which) == 13){
                eventHandler.addUser();
                displayLocalDbMessages();
                setIntervalPromise(syncMessages, syncInterval);
            }
        })
        .on("keyup", "#msgBox", function (e) {
            (e.keyCode || e.which) == 13 && $("#btnSendMsg").click();
        })
        .on("click", "#exitChat", eventHandler.exitChat);
});