///<reference path="winjs.d.ts" />
///<reference path="winrt.d.ts" />
///<reference path="SamiTS/sami.d.ts" />
"use strict";
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
                mediaplayer.winControl.currentTime -= 10;
                break;
            case "Left":
                mediaplayer.winControl.currentTime += 10;
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
    newevt.initPointerEvent(name, evt.bubbles, evt.cancelable, evt.view, evt.detail, evt.screenX, evt.screenY, evt.clientX, evt.clientY, evt.ctrlKey, evt.altKey, evt.shiftKey, evt.metaKey, evt.button, evt.relatedTarget, evt.offsetX, evt.offsetY, evt.width, evt.height, evt.pressure, evt.rotation, evt.tiltX, evt.tiltY, evt.pointerId, evt.pointerType, evt.hwTimestamp, evt.isPrimary);
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
function read() {
    var picker = new Windows.Storage.Pickers.FileOpenPicker();
    picker.fileTypeFilter.push(".3g2", ".3gp2", ".3gp", ".3gpp", ".m4v", ".mp4v", ".mp4", ".mov");
    picker.fileTypeFilter.push(".m2ts");
    picker.fileTypeFilter.push(".asf", ".wm", ".wmv");
    picker.fileTypeFilter.push(".avi");
    picker.fileTypeFilter.push(".smi", ".vtt", ".ttml");
    picker.pickMultipleFilesAsync().done(load);
}

function load(files) {
    var player = mediaplayer.winControl.mediaElement;

    //var files = (<HTMLInputElement>evt.target).files;
    var videofile;
    var subfile;
    var samifile;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        switch (getFileExtension(file)) {
            case "smi":
                if (!subfile)
                    samifile = file;
                break;
            case "vtt":
            case "ttml":
                if (!subfile)
                    subfile = file;
                break;
            default:
                if (!videofile)
                    videofile = file;
        }
        if (videofile && (subfile || samifile))
            break;
    }

    if (videofile) {
        while (player.firstChild) {
            URL.revokeObjectURL(player.firstChild.src);
            player.removeChild(player.firstChild);
        }
        if (subtitleString)
            subtitleString = '';
        if (mediaplayer.winControl.src)
            URL.revokeObjectURL(mediaplayer.winControl.src);
        mediaplayer.winControl.src = URL.createObjectURL(videofile);
    }
    if (subfile) {
        //mediaplayer.winControl.tracks.push({
        //    label: "日本語",
        //    kind: "subtitles",
        //    srclang: "ja",
        //    src: URL.createObjectURL(subfile),
        //    default: true
        //});
        var track = document.createElement("track");
        track.label = "日本語";
        track.kind = "subtitles";
        track.srclang = "ja";
        track.src = URL.createObjectURL(subfile);
        track.default = true;
        player.appendChild(track);
        mediaplayer.winControl.play();
        exportbutton.style.display = 'none';
    } else if (samifile) {
        subtitleFileDisplayName = getFileDisplayName(samifile);

        var loadSubtitle = function (result) {
            subtitleString = result;

            //mediaplayer.winControl.tracks.push({
            //    label: "日本語",
            //    kind: "subtitles",
            //    srclang: "ja",
            //    src: URL.createObjectURL(new Blob([result], { type: "text/vtt" })),
            //    default: true
            //});
            //var track = document.createElement("track");
            //track.label = "日本語";
            //track.kind = "subtitles";
            //track.srclang = "ja";
            //track.src = URL.createObjectURL(new Blob([result], { type: "text/vtt" }));
            //track.default = true;
            //var tempvideo = document.createElement("video");
            //tempvideo.appendChild(track);
            //var trackobject = tempvideo.textTracks[0];
            //tempvideo.removeChild(track);
            mediaplayer.winControl.tracks = [
                {
                    kind: 'subtitles',
                    label: '日本語',
                    src: URL.createObjectURL(new Blob([result], { type: "text/vtt" })),
                    srclang: 'ja',
                    default: true
                }
            ];
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
            SamiTS.convertToWebVTTFromFile(samifile, loadSubtitle, { onstyleload: loadStyle });
        } catch (e) {
            new Windows.UI.Popups.MessageDialog("자막을 읽지 못했습니다.").showAsync();
        }
    } else
        mediaplayer.winControl.play();
}

function getExtensionForSubType(subtype) {
    switch (subtype) {
        case 0 /* WebVTT */:
            return ".vtt";
        case 1 /* SRT */:
            return ".srt";
    }
}

function getMIMETypeForSubType(subtype) {
    switch (subtype) {
        case 0 /* WebVTT */:
            return "text/vtt";
        case 1 /* SRT */:
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
            Windows.Storage.FileIO.writeTextAsync(file, subtitleString).done(function () {
                Windows.Storage.CachedFileManager.completeUpdatesAsync(file);
            });
            ;
        });
        //navigator.msSaveBlob(subtitleFile, subtitleFileDisplayName + ".vtt");
    }
}

function flagBackground() {
    var src = mediaplayer.winControl.src;
    var currentTime = mediaplayer.winControl.currentTime;
    var paused = mediaplayer.winControl.paused;
    mediaplayer.winControl.src = '';
    if (mediaplayer.winControl.msAudioCategory === "Other")
        mediaplayer.winControl.msAudioCategory = "BackgroundCapableMedia";
    else
        mediaplayer.winControl.msAudioCategory = "Other";
    mediaplayer.winControl.src = src;
    mediaplayer.winControl.onloadedmetadata = function () {
        mediaplayer.winControl.currentTime = currentTime;
        if (!paused)
            mediaplayer.winControl.play();
    };
}
//# sourceMappingURL=app.js.map
