"use strict";
var StorageFile = Windows.Storage.StorageFile;
var FileIO = Windows.Storage.FileIO;

var style;

var samiDocument;
var subtitleFileDisplayName;
var cursorTimerId;
var prevPointerX = -1;
var prevTime = -1;
var wasPaused = false;

var SubType;
(function (SubType) {
    SubType[SubType["WebVTT"] = 0] = "WebVTT";
    SubType[SubType["SRT"] = 1] = "SRT";
})(SubType || (SubType = {}));

document.addEventListener("DOMContentLoaded", domContentLoad);

function domContentLoad() {
    touchpanel.onpointerdown = pointerdown;
    touchpanel.onpointermove = pointermove;
    touchpanel.onpointerup = pointerup;

    exportButton.onclick = exportSubtitle;
    flagButton.onclick = flagBackground;
    openButton.onclick = read;

    addPointerEventTransmitter("down");
    addPointerEventTransmitter("up");
    addPointerEventTransmitter("move");
    WinJS.UI.processAll().done(function () {
        var slider = mediaplayer.querySelector("[title=Seek]").getElementsByTagName("input")[0];
        slider.addEventListener("focus", function () {
            mediaplayer.focus();
        });
    });
}

function addPointerEventTransmitter(name) {
    mediaplayer.addEventListener("pointer" + name, function (evt) {
        if (evt.clientY <= document.body.clientHeight - 42)
            touchpanel.dispatchEvent(copyPointerEvent(evt, "pointer" + name));
    });
}

function copyPointerEvent(evt, name) {
    var newevt = document.createEvent("PointerEvent");
    newevt.initPointerEvent(name, evt.bubbles, evt.cancelable, evt.view, evt.detail, evt.screenX, evt.screenY, evt.clientX, evt.clientY, evt.ctrlKey, evt.altKey, evt.shiftKey, evt.metaKey, evt.button, evt.relatedTarget, evt.offsetX, evt.offsetY, evt.width, evt.height, evt.pressure, evt.rotation, evt.tiltX, evt.tiltY, evt.pointerId, evt.pointerType, evt.hwTimestamp, evt.isPrimary);
    return newevt;
}

WinJS.UI.eventHandler(play);
WinJS.UI.eventHandler(pause);
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
        if (isClick(differ))
            return;
        mediaplayer.winControl.pause();
        mediaplayer.winControl.currentTime = prevTime + differ / document.body.clientHeight * 10;
    }
}
function pointerdown(evt) {
    if ((mediaplayer.winControl.readyState == 4) && (evt.pointerType !== "mouse" || evt.button == 0)) {
        prevPointerX = evt.clientX;
        prevTime = mediaplayer.winControl.currentTime;
        wasPaused = mediaplayer.winControl.paused;

        mediaplayer.winControl.pause();
    }
}
function pointerup(evt) {
    if (isClick(prevPointerX - evt.clientX)) {
        if (wasPaused)
            mediaplayer.winControl.play();
        else
            mediaplayer.winControl.pause();
    }

    prevPointerX = -1;
    prevTime = -1;
    wasPaused = false;
}
function isClick(moveX) {
    return (Math.abs(moveX) / screen.deviceXDPI < 0.04);
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
    picker.fileTypeFilter.push(".3g2", ".3gp2", ".3gp", ".3gpp", ".m4v", ".mp4v", ".mp4", ".mov", ".m2ts", ".asf", ".wm", ".wmv", ".avi", ".smi", ".vtt", ".ttml");
    picker.pickMultipleFilesAsync().done(load);
}

function load(files) {
    var player = mediaplayer.winControl.mediaElement;

    //var files = (<HTMLInputElement>evt.target).files;
    var videofile;
    var subfile;
    var samifile;
    for (var i = 0; i < files.length; i++) {
        var file = files.getAt(i);
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
        if (samiDocument)
            samiDocument = null;
        if (mediaplayer.winControl.src)
            URL.revokeObjectURL(mediaplayer.winControl.src);
        mediaplayer.winControl.src = URL.createObjectURL(videofile);
    }
    if (subfile) {
        loadSubtitle(subfile);

        mediaplayer.winControl.play();
        exportButton.style.display = 'none';
    } else if (samifile) {
        subtitleFileDisplayName = getFileDisplayName(samifile);

        var loadStyle = function (resultStyle) {
            if (style)
                document.head.removeChild(style);
            style = resultStyle;
            document.head.appendChild(resultStyle);
        };

        Promise.resolve(FileIO.readTextAsync(samifile)).then(function (samistr) {
            return SamiTS.createSAMIDocument(samistr);
        }).then(function (samidoc) {
            samiDocument = samidoc;
            return SamiTS.createWebVTT(samidoc, { createStyleElement: true });
        }).then(function (result) {
            loadSubtitle(result.subtitle);
            loadStyle(result.stylesheet);

            mediaplayer.winControl.play();
            exportButton.style.display = 'inline-block';
        }).catch(function (error) {
            new Windows.UI.Popups.MessageDialog("자막을 읽지 못했습니다.").showAsync();
        });
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

function loadSubtitle(result) {
    var blob;
    if (typeof result === "string")
        blob = new Blob([result], { type: "text/vtt" });
    else
        blob = result;

    mediaplayer.winControl.tracks = [
        {
            kind: 'subtitles',
            src: URL.createObjectURL(blob, { oneTimeOnly: true }),
            default: true
        }
    ];
}

function exportSubtitle() {
    if (samiDocument) {
        var picker = new Windows.Storage.Pickers.FileSavePicker();
        picker.fileTypeChoices.insert("WebVTT", [".vtt"]);
        picker.suggestedFileName = subtitleFileDisplayName;

        var result;
        var file;
        SamiTS.createWebVTT(samiDocument).then(function (_result) {
            result = _result;
            return picker.pickSaveFileAsync();
        }).then(function (_file) {
            file = _file;
            Windows.Storage.CachedFileManager.deferUpdates(file);
            return FileIO.writeTextAsync(file, result.subtitle);
        }).then(function () {
            return Windows.Storage.CachedFileManager.completeUpdatesAsync(file);
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
