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

    $(window).resize(function () {

        //Page
        Page.active.modified = true
        Page.active.resize()


    })

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

    $('#next').click(function () {
        Page.active.displayNext()
    })
    $('#before').click(function () {
        Page.active.displayBefore()
    })

})

var pageNumber = 1

/* ############# Text ############## */

Text = function (options, parent) {
    var self = {}
    self.id = options._id
    self.text = options.text
    self.user = options.user || "Anonymous"
    self.page = parent.id || 0;
    self.displayed = false;

    self.display = function () {
        var entryUser = '<span class="upperlink"><a class="number" data-tooltip="Written by ' + self.user + '">' + (self.id) + '</a></span>';

        var entryContent = '<span class="entry-content p' + self.page + ' id' + self.id + '" data_order="' + self.id + '">' + self.text + entryUser + '</span>';

        $('#page' + self.page).append(entryContent)
        self.displayed = true;



        var selector = '.p' + self.page + '.id' + self.id
        self.dom = $(selector)

        $(selector + ' [data-tooltip!=""]').qtip({
            content: {
                attr: 'data-tooltip'
            },
            style: {
                classes: 'qtip-blue qtip-tipsy'
            }
        })
    }
    self.undisplay = function () {
        self.displayed = false;
        if (self.dom)
            self.dom.remove()
    }
    self.changePage = function (page) {
        if (!page) {
            return
        }
        self.undisplay()
        self.page = page.id
        page.text[self.id] = self
        self.display()
    }

    self.delete = function () {
        Text.nextId = self.id
        delete Text.list[self.id]
    }
    Text.list[self.id] = self
    return self
}
Text.list = {}

/* ############# Page ############## */

Page = function (data = {}) {
    var self = {}
    self.id = Page.nextId
    Page.nextId++;
    self.text = {}
    self.active = false;
    if (Page.active == null) {
        self.active = true;
    }
    self.dom;
    self.createDom = function () {
        self.dom = $('#page' + self.id)
        if (self.dom.length == 0) {
            $('#display .container').append("<div class='wrapper' id='page" + self.id + "'></div>")
        }
        self.dom = $('#page' + self.id)
    }
    self.createDom()
    self.maxLength = null;
    self.modified = true;

    /*

        TODO ; Add a "modified" property that change when something move and if not changed display directly
        
    */

    self.reduceContent = function (cpt = 0) {
        if (cpt > 20) {
            return
        }
        cpt++

        // Content too long
        if (self.checkOverflow()) {
            self.giveLastEntry()
            self.reduceContent(cpt)
            self.bind()
        }
    }
    self.addContent = function (cpt = 0) {
        if (cpt > 20) {
            return
        }
        cpt++

        if (self.stealFirstEntry()) {
            self.addContent(cpt)
        }

    }
    self.resize = function () {
        if (!self.modified) {
            return
        }

        // Content too long
        if (self.checkOverflow()) {
            self.reduceContent()
        } else {
            self.addContent()
        }

        self.reorder()
        self.modified = false;
    }
    self.reorder = function () {
        if (self.isOrdered()) {
            return
        }

        for (var i in self.text) {
            var text = self.text[i]
            console.log(text.id)
            text.undisplay()
            text.display()
        }

    }
    self.isOrdered = function () {
        if (self.dom.children('.entry-content').length == 1) {
            return true;
        }

        var ordered;
        var cpt = 0

        function descend(elt, id = null) {
            cpt++

            // work only for the current configuration :
            // "entry-content p1 id17"
            var currentId = elt.attr('data-order')
            if (id == null) {
                id = currentId
            }
            if (currentId < id) {
                ordered = false
            } else {
                elt = elt.next()
                if (elt.length == 0) {
                    ordered = true
                } else {
                    descend(elt, currentId)
                }

            }

        }
        descend(self.getFirstText().dom)
        if (cpt != self.dom.children('.entry-content').length) {
            return false
        }
        return ordered;
    }
    // Problem with the first page
    // Recurssion stop at 10

    self.displayNext = function () {
        self.setNotActive()
        self.next().setActive()
        self.next().resize()
    }
    self.displayBefore = function () {
        self.setNotActive()
        self.before().setActive()
        self.before().resize()
    }

    self.setNotActive = function () {
        self.dom.removeClass("active")
        self.active = false;
    }
    self.setActive = function () {
        self.dom.addClass("active")
        $('#pager').text(self.id + 1)
        self.active = true;
        Page.active = self;
        self.reduceContent()
        self.reorder()
        self.bind()
        if (!self.next()) {
            self.requestChunk()
        }

    }
    self.displayAllText = function () {
        for (var i in self.text) {
            var text = self.text[i]
            text.display()
        }
    }

    self.requestChunk = function () {
        if (ALLDATAGATHERED) {
            return
        }
        socket.emit("requestChunk", self.getLastText().id + 1)
    }
    self.appendEntry = function (data) {
        var text = new Text(data, self)
        self.text[text.id] = text
        text.display()
        self.reduceContent()
    }

    self.checkLastEntry = function () {
        if (self.checkOverflow()) {
            self.giveLastEntry()
            return true
        } else {
            return false
        }
    }
    self.giveLastEntry = function () {
        if (!self.next()) {
            new Page()
        }

        var id = self.getLastText().id
        self.getLastText()
            .changePage(self.next())
        delete self.text[id]
        self.modified = true;
    }
    self.stealFirstEntry = function () {

        var text = self.next().getFirstText()
        if (!text) {
            return
        }
        text.changePage(self)
        delete self.next().text[text.id]
        self.modified = true;
        if (self.checkOverflow()) {
            self.giveLastEntry()
            // Plus de place, on arrete
            return false
        } else {
            // ON peut essayer de continuer
            return true
        }
    }

    // Helpers
    self.next = function () {
        var page = Page.list[self.id + 1]
        if (page) {
            return page
        } else {
            return false
        }
    }
    self.before = function () {
        var page = Page.list[self.id - 1]
        if (page) {
            return page
        } else {
            return false
        }
    }
    self.getLastText = function () {
        var n = 0;
        for (var i in self.text) {
            if (n < self.text[i].id) {
                n = self.text[i].id
            }
        }
        return self.text[n]
    }
    self.getFirstText = function () {
        var n = null;
        for (var i in self.text) {
            if (n == null) {
                n = self.text[i].id
            }
            if (n > self.text[i].id) {
                n = self.text[i].id
            }
        }
        return self.text[n]
    }
    self.isLastPage = function () {
        return self.id == Page.getLast().id
    }
    self.checkOverflow = function () {
        var el = self.dom[0]
        var curOverflow = el.style.overflow;
        if (!curOverflow || curOverflow === "visible") {
            el.style.overflow = "hidden";
        }
        var isOverflowing =
            el.clientHeight < el.scrollHeight;

        el.style.overflow = curOverflow;

        return isOverflowing;
    }
    // return true if there is an overflow
    self.setCharLength = function () {
        self.maxLength = self.dom[0].innerText.self
    }
    self.bind = function () {
        if (!self.before()) {
            $('#before').addClass('invisible')
        } else {
            $('#before').removeClass('invisible')
        }

        if (!self.next()) {
            $('#next').addClass('invisible')
        } else {
            $('#next').removeClass('invisible')
        }
    }

    if (self.active) {
        Page.active = self
    }
    Page.list[self.id] = self
    return self
}
Page.list = {}
Page.active = null;
Page.getLast = function () {
    var page = Page.list[Page.nextId - 1]
    return page
}
Page.requestEntry = function () {
    socket.emit('requestEntry')
}
Page.nextId = 0;
Page.letterCount = 2000;


/* ############# Socket ############## */

socket.on("connect", function (data) {
    var page = Page()
})
socket.on("chunk", function (data) {
    $('#loading').remove()

    //console.log(data)

    var array = []
    for (var a in data) {
        var entry = data[a]
        //        array.push(entry)
        Page.getLast().appendEntry(entry)

    }

    //    var i = 0;
    //
    //    function loop() {
    //
    //        //PAUSE
    //        setTimeout(function () {
    //            Page.getLast().appendEntry(array[i])
    //            i++
    //            if (i < array.length) {
    //                loop()
    //            }
    //        }, 1)
    //    }
    //
    //    loop()
})
socket.on("toastr", function (data) {
    if (data.type && data.message) {
        toastr[data.type](data.message)
    }
})
socket.on("entry", function (data) {
    Page.getLast().appendEntry(data)
})
socket.on("allDataGathered", function () {
    ALLDATAGATHERED = true
})

var LETTER_COUNT = 0;
var ALLDATAGATHERED = false
// helpers
var countTextarea = function (elem) {
    var l = elem.val().length
    if (l <= 800) {
        $("#textarea-info").html((800 - l) + " caracters")
    } else {
        elem.val(elem.val().substr(0, 800))
        $("#textarea-info").html("0 caracters")
    }
}

server = function (command) {
    socket.emit("command", command)
}
socket.on('commandResult', function (data) {
    console.log(data)
})
