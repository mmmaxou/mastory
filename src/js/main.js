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
        data = $("#write textarea").val()
        if (!data) {
            toastr["error"]("The input should not be empty");
        }

        socket.emit("entry", data);
    })

})

socket.on("connect", function (data) {

    $('#display').children().remove()

})
socket.on("init", function (data) {

    for (var a in data) {
        displayLine(data[a].text)
    }

})
socket.on("update", function (data) {

    displayLine(data)

})

var displayLine = function (line) {
    var entryContent = '<div class="entry-content">' + line + '</div>'
    var entry = '<div class="entry">' + entryContent + '</div>'
    $('#display').append(entry)
    var display = document.getElementById("display");
    display.scrollTop = display.scrollHeight;
}
