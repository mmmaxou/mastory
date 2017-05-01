socket = io.connect({
    'reconnection': true,
    'reconnectionDelay': 500,
    'reconnectionAttempts': 10
})
var toastr = require('toastr')
toastr.options = {
    "closeButton": true,
    "debug": false,
    "newestOnTop": true,
    "progressBar": true,
    "positionClass": "toast-top-center",
    "preventDuplicates": true,
    "onclick": null,
    "showDuration": "300",
    "hideDuration": "1000",
    "timeOut": "5000",
    "extendedTimeOut": "1000",
    "showEasing": "swing",
    "hideEasing": "linear",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut"
}
var trianglify = require('trianglify')

var connected = true

$(document).ready(function () {

    var pattern = trianglify({
        width: window.innerWidth,
        height: window.innerHeight,
    })
    $('#full-body').append(pattern.svg({
        includeNamespace: true
    }))

    $('#write form').submit(function (e) {
        e.preventDefault()
        data = {}
        data.text = $("#write textarea").val()
        if (!data.text) {
            toastr["error"]("The input should not be empty");
        }
        data.user = $('#write input[type="text"]').val()

        socket.emit("entry", data);
    })
    countTextarea($('#write textarea'))
    $('#write textarea')
        .keyup(function () {
            countTextarea($(this))
        })
        .change(function () {
            countTextarea($(this))
        })

})

var messageNumber = 1
socket.on("connect", function (data) {

})
socket.on("init", function (data) {
    $('#loading').remove()

    for (var a in data) {
        displayLine(data[a])
    }

})
socket.on("update", function (data) {

    displayLine(data)

})


// helpers
var displayLine = function (data) {
    var entryUser = '<span class="upperlink"><a class="number" data-tooltip="Written by ' + data.user + '">' + (messageNumber++) + '</a></span>'

    var entryContent = '<span class="entry-content">' + data.text + entryUser + '</span>'
    $('#display .wrapper').append(entryContent)
    $('[data-tooltip!=""]').qtip({
        content: {
            attr: 'data-tooltip'
        },
        style: {
            classes: 'qtip-blue qtip-tipsy'
        }
    })


    //Scroll if necessary
    var display = document.getElementById("display");
    display.scrollTop = display.scrollHeight;
}
var countTextarea = function (elem) {
    var l = elem.val().length
    if (l <= 800) {
        $("#textarea-info").html((800 - l) + " caracters")
    } else {
        elem.val(elem.val().substr(0, 800))
        $("#textarea-info").html("0 caracters")
    }
}
