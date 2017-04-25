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

    var io = require('socket.io')(serv, {})
    io.sockets.on('connection', function (socket) {

        var id = Math.random()
        SOCKET_LIST[id] = socket

        // Send the whole Database
        emitDB(socket)

        // Send the last entry to all

        socket.on("entry", function (data) {

            var collection = db.collection("story");
            insertDocuments(collection, {
                text: data
            })
            emitToAll(data)

        })

    })

}
var emitDB = function (socket) {

    var collection = db.collection("story")
    findDocuments(collection, function (data) {

        socket.emit("init", data)

    })
}
var emitToAll = function (data) {

    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i]
        socket.emit("update", data)
    }

}
var findDocuments = function (collection, callback) {
    // Find some documents
    collection.find({}).toArray(function (err, docs) {
        if (err) {
            console.error("Error : " + err)
            return
        }
        console.log("Found the records");
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
