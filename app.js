var DEPLOY = true
var DIRECT_CONNECT = true;
var mongojs, db;
if (!DEPLOY) {
    // Off Line
    mongojs = require('mongojs')
    db = mongojs('localhost:27017/mastory', ['account', 'story'])
} else {
    db = null;
}

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

var io = require('socket.io')(serv, {})
io.sockets.on('connection', function (socket) {

    var id = Math.random()
    SOCKET_LIST[id] = socket

    // Send the whole Database
    emitDB(socket)

    // Send the last entry to all
    socket.on("entry", function (data) {

        db.story.insert({
            text: data
        })
        emitToAll(data)

    })

})

var emitDB = function (socket) {
    findDocuments("story", function (data) {

        socket.emit("init", data)

    })
}
var emitToAll = function (data) {

    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i]
        socket.emit("update", data)
    }

}
var findDocuments = function (selector, callback) {
    // Get the documents collection
    var collection = db.collection(selector);
    // Find some documents
    collection.find({}).toArray(function (err, docs) {
        if (err) {
            console.error("Error : " + err)
            return
        }
        console.log("Found the following records");
        console.log(docs)
        callback(docs);
    });
}
