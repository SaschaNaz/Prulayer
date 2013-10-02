///<reference path="winjs.d.ts" />
///<reference path="winrt.d.ts" />
///<reference path="SamiTS/SamiTS/samiconverter.ts" />
"use strict";
var slider;
var style;

var subtitleString;
var subtitleFileDisplayName;
var cursorTimerId;
var keyboardTimerStarterId;
var keyboardTimerId;
var prevPointerX = -1;
var prevTime = -1;

var SubType;
(function (SubType) {
    SubType[SubType["WebVTT"] = 0] = "WebVTT";
    SubType[SubType["SRT"] = 1] = "SRT";
})(SubType || (SubType = {}));

function domContentLoad() {
    addPointerEventTransmitter("down");
    addPointerEventTransmitter("up");
    addPointerEventTransmitter("move");
    addKeyboardEventTransmitter("down");
    WinJS.UI.processAll().done(function () {
        slider = mediaplayer.querySelector("[title=Seek]").getElementsByTagName("input")[0];
        slider.focus();
        mediaplayer.addEventListener("focus", function () {
            slider.focus();
        });
    });
}

function addPointerEventTransmitter(name) {
    mediaplayer.addEventListener("pointer" + name, function (evt) {
        if (evt.clientY <= document.body.clientHeight - 42)
            touchpanel.dispatchEvent(copyPointerEvent(evt, "pointer" + name));
    });
}

function addKeyboardEventTransmitter(name) {
    mediaplayer.addEventListener("key" + name, function (evt) {
        switch (evt.key) {
            case "Right":
            case "Left":
                if (evt.target != slider) {
                    slider.focus();
                    if (evt.keyCode == 37)
                        mediaplayer.winControl.currentTime -= 10;
else if (evt.keyCode == 39)
                        mediaplayer.winControl.currentTime += 10;
                }
                break;
            case "Spacebar":
                if (mediaplayer.winControl.paused)
                    mediaplayer.winControl.play();
else
                    mediaplayer.winControl.pause();
                break;
        }
    });
}

function copyPointerEvent(evt, name) {
    var newevt = document.createEvent("PointerEvent");
    (newevt).initPointerEvent(name, true, true, evt.view, evt.detail, evt.screenX, evt.screenY, evt.clientX, evt.clientY, evt.ctrlKey, evt.altKey, evt.shiftKey, evt.metaKey, evt.button, evt.relatedTarget, evt.offsetX, evt.offsetY, evt.width, evt.height, evt.pressure, evt.rotation, evt.tiltX, evt.tiltY, evt.pointerId, evt.pointerType, evt.hwTimestamp, evt.isPrimary);
    return newevt;
}

//function copyKeyboardEvent(evt: KeyboardEvent, name: string) {
//    var newevt = document.createEvent("KeyboardEvent");
//    (<any>newevt).initKeyboardEvent(name, true, true, evt.view, evt.key, evt.location, [], evt.repeat, evt.locale);
//    return newevt;
//}
WinJS.UI["eventHandler"](play);
WinJS.UI["eventHandler"](pause);
WinJS.Namespace.define("startPage", {
    playHandler: play,
    pauseHandler: pause
});
function play(evt) {
    if (cursorTimerId)
        clearTimeout(cursorTimerId);
    cursorTimerId = setTimeout(function () {
        mediaplayer.style.cursor = "none";
    }, 3000);
}
function pause(evt) {
    if (cursorTimerId)
        clearTimeout(cursorTimerId);
    mediaplayer.style.cursor = "auto";
}
function pointermove(evt) {
    if (cursorTimerId)
        clearTimeout(cursorTimerId);
    mediaplayer.style.cursor = "auto";
    if (!mediaplayer.winControl.paused)
        cursorTimerId = setTimeout(function () {
            mediaplayer.style.cursor = "none";
        }, 3000);

    if (prevPointerX != -1) {
        var differ = prevPointerX - evt.clientX;
        if (Math.abs(differ) / screen.deviceXDPI < 0.04)
            return;
        mediaplayer.winControl.pause();
        mediaplayer.winControl.currentTime = prevTime + differ / document.body.clientHeight * 10;
    }
}
function pointerdown(evt) {
    if ((mediaplayer.winControl.readyState == 4) && (evt.pointerType !== "mouse" || evt.button == 0)) {
        prevPointerX = evt.clientX;
        prevTime = mediaplayer.winControl.currentTime;
    }
}
function pointerup(evt) {
    if (prevPointerX >= 0 && (mediaplayer.winControl.readyState == 4) && (evt.pointerType !== "mouse" || evt.button == 0)) {
        if (mediaplayer.winControl.paused)
            mediaplayer.winControl.play();
else
            mediaplayer.winControl.pause();
    }

    prevPointerX = -1;
    prevTime = -1;
}

//function time(evt: KeyboardEvent) {
//    (<HTMLElement>mediaplayer.querySelector("[title=Seek]").getElementsByTagName("input")[0]).focus();
//}
//function keyup(evt: KeyboardEvent) {
//    if (evt.keyCode == 37 || evt.keyCode == 39)
//        mediaplayer.winControl.play();
//}
function load(evt) {
    var player = mediaplayer.getElementsByTagName("video")[0];
    var files = (evt.target).files;
    var videofile;
    var subfile;
    var samifile;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (!videofile && mediaplayer.winControl.canPlayType(file.type))
            videofile = file;
else if (!subfile)
            switch (getFileExtension(file)) {
                case "smi":
                    samifile = file;
                    break;
                case "vtt":
                case "ttml":
                    subfile = file;
                    break;
            }
        if (videofile && (subfile || samifile))
            break;
    }

    if (videofile) {
        while (player.firstChild)
            player.removeChild(player.firstChild);
        if (subtitleString)
            subtitleString = '';
        mediaplayer.winControl.src = URL.createObjectURL(videofile);
    }
    if (subfile) {
        var track = document.createElement("track");
        track.label = "日本語";
        track.kind = "subtitles";
        track.srclang = "ja";
        track.src = URL.createObjectURL(subfile);
        track.default = true;
        player.appendChild(track);
        mediaplayer.winControl.play();
        exportbutton.style.display = 'none';
    }
    if (samifile) {
        subtitleFileDisplayName = getFileDisplayName(samifile);

        var loadSubtitle = function (result) {
            subtitleString = result;

            var track = document.createElement("track");
            track.label = "日本語";
            track.kind = "subtitles";
            track.srclang = "ja";
            track.src = URL.createObjectURL(new Blob([result], { type: "text/vtt" }));
            track.default = true;
            player.appendChild(track);
            mediaplayer.winControl.play();
            exportbutton.style.display = 'inline-block';
        };
        var loadStyle = function (resultStyle) {
            if (style)
                document.head.removeChild(style);
            style = resultStyle;
            document.head.appendChild(resultStyle);
        };

        try  {
            SamiTS.convertToWebVTTFromFile(samifile, loadSubtitle, loadStyle);
        } catch (e) {
            new Windows.UI.Popups.MessageDialog("자막을 읽지 못했습니다.").showAsync();
        }
    }
}

function getExtensionForSubType(subtype) {
    switch (subtype) {
        case SubType.WebVTT:
            return ".vtt";
        case SubType.SRT:
            return ".srt";
    }
}

function getMIMETypeForSubType(subtype) {
    switch (subtype) {
        case SubType.WebVTT:
            return "text/vtt";
        case SubType.SRT:
            return "text/plain";
    }
}

function getFileExtension(file) {
    var splitted = file.name.split('.');
    return splitted[splitted.length - 1].toLowerCase();
}

function getFileDisplayName(file) {
    var splitted = file.name.split('.');
    splitted = splitted.slice(0, splitted.length - 1);
    return splitted.join('.');
}

function exportSubtitle() {
    if (subtitleString) {
        var picker = new Windows.Storage.Pickers.FileSavePicker();
        picker.fileTypeChoices.insert("WebVTT", [".vtt"]);
        picker.suggestedFileName = subtitleFileDisplayName;
        picker.pickSaveFileAsync().done(function (file) {
            Windows.Storage.CachedFileManager.deferUpdates(file);
            (Windows.Storage.FileIO.writeTextAsync(file, subtitleString)).done(function () {
                Windows.Storage.CachedFileManager.completeUpdatesAsync(file);
            });
            ;
        });
        //navigator.msSaveBlob(subtitleFile, subtitleFileDisplayName + ".vtt");
    }
}
//# sourceMappingURL=app.js.map
