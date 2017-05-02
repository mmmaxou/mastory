var DEPLOY = true;
var DIRECT_CONNECT = true;
var db, url;
var MongoClient = require('mongodb').MongoClient
var assert = require('assert')
if (!DEPLOY) {
    // Off Line
    url = 'mongodb://localhost:27017/mastory';

} else {
    // ON line
    var mLabUser = "mmmaxou"
    var mLabpass = "azeazeaze1"
    url = 'mongodb://' + mLabUser + ':' + mLabpass + '@ds117931.mlab.com:17931/mastory';
}

MongoClient.connect(url, function (err, database) {
    assert.equal(null, err);
    console.log("Connected successfully to server");
    db = database;

    initSockets()
});

//init
var express = require('express')
var app = express()
var serv = require('http').Server(app)

//router
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/build/html/index.html')
})
app.use('/build', express.static(__dirname + '/build'))

serv.listen(process.env.PORT || 2000)
console.log("Server started")

var SOCKET_LIST = {}
var DEBUG = true;

var isValidPassword = function (data, callback) {
    if (DEPLOY)
        return callback(true)

    db.account.find({
        username: data.username,
        password: data.password
    }, function (err, res) {
        if (res.length > 0)
            callback(true)
        else
            callback(false)
    })
}
var isUsernameTaken = function (data, callback) {
    if (DEPLOY)
        return callback(false)

    db.account.find({
        username: data.username
    }, function (err, res) {
        if (res.length > 0)
            callback(true)
        else
            callback(false)
    })
}
var addUser = function (data, callback) {
    if (DEPLOY)
        return callback()
    db.account.insert({
        username: data.username,
        password: data.password
    })
    callback()
}

var initSockets = function () {

    var DATABASE_COUNT;
    getLastDocument(db.collection("story"), function (doc) {
        if (doc.length == 0) {
            DATABASE_COUNT = 1
            //console.log("new")
        } else {
            DATABASE_COUNT = doc[0]._id + 1
            //console.log("exist")
            //console.log(doc)
        }
        //console.log(DATABASE_COUNT)
    })

    var io = require('socket.io')(serv, {})
    io.sockets.on('connection', function (socket) {

        var id = Math.random()
        SOCKET_LIST[id] = socket

        // Send the whole Database
        sendChunk(socket, 1)

        // Send the last entry to all

        socket.on("entry", function (data) {

            for (var i in data) {
                data[i] = escapeHtml(data[i])
            }
            // Warn user
            if (!data.user) {
                data.user = "Anonymous"
                var answer = {
                    type: "warning",
                    message: "You haven't given any username so you will be referred as Anonymous."
                }
                socket.emit('toastr', answer)
            }

            var entry = {
                _id: DATABASE_COUNT++,
                text: data.text,
                user: data.user,
            }

            var collection = db.collection("story");
            insertDocuments(collection, entry)

            var answer = {
                type: "success",
                message: "Your story has successfully been submitted."
            }
            socket.emit('toastr', answer)

            emitToAll(entry)

        })

        socket.on("requestChunk", function (id) {
            sendChunk(socket, id)
        })

        socket.on("command", function (command) {
            var res = eval(command)
            socket.emit("commandResult", res)
        })

    })
}

var CHUNK_SIZE = 4000;
var sendChunk = function (socket, id) {
    var collection = db.collection("story")
    var size = 0;
    var data = []

    function collect(id) {

        getDocumentId(collection, id, function (doc) {
            if (doc[0]) {
                size += doc[0].text.length;
                data.push(doc[0])
                id++
            } else {
                socket.emit("chunk", data)
                socket.emit("allDataGathered")
                console.log("all data gathered")
                return
            }

            if (size < CHUNK_SIZE) {
                collect(id)
            } else {
                socket.emit("chunk", data)
            }
        })

    }
    collect(id)
}

var emitDB = function (socket) {
    var collection = db.collection("story")
    findDocuments(collection, function (data) {
        socket.emit("chunk", data)
    })
}
var emitToAll = function (data) {

    for (var i in SOCKET_LIST) {
        console.log("data emitted")
        console.log(data)
        var socket = SOCKET_LIST[i]
        socket.emit("entry", data)
    }

}
var escapeHtml = function (text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
var findDocuments = function (collection, callback) {
    // Find some documents
    collection
        .find({})
        .sort({
            _id: 1
        }).toArray(function (err, docs) {
            if (err) {
                console.error("Error : " + err)
                return
            }
            callback(docs);
        });
}
var insertDocuments = function (collection, data) {
    // Insert some documents
    collection.insert(data, function (err, result) {
        assert.equal(err, null);
        console.log("Inserted the data into the collection");
    });
}
var getLastDocument = function (collection, callback) {
    collection
        .find()
        .limit(1)
        .sort({
            $natural: -1
        })
        .toArray(function (err, doc) {
            if (err) {
                console.error("Error : " + err)
                callback(null)
            }
            callback(doc);
        })

}
var getDocumentId = function (collection, id, callback) {
    collection
        .find({
            _id: id
        })
        .toArray(function (err, doc) {
            if (err) {
                console.error("Error : " + err)
                callback(null)
            }
            callback(doc);
        })
}
