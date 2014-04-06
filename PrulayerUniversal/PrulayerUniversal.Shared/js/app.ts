///<reference path="winjs.d.ts" />
///<reference path="winrt.d.ts" />
///<reference path="SamiTS/sami.d.ts" />
"use strict";

declare var mediaplayer: HTMLDivElement;
declare var touchpanel: HTMLDivElement;
declare var exportButton: HTMLButtonElement;
declare var flagButton: HTMLButtonElement;
declare var openButton: HTMLButtonElement;
var style: HTMLStyleElement;

var subtitleString: string;
var subtitleFileDisplayName: string;
var cursorTimerId: number;
var prevPointerX = -1;
var prevTime = -1;
var wasPaused = false;

enum SubType {
    WebVTT, SRT
}

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
    addKeyboardEventTransmitter("down");
    WinJS.UI.processAll().done(() => {
        var slider = <HTMLInputElement>mediaplayer.querySelector("[title=Seek]").getElementsByTagName("input")[0];
        slider.addEventListener("focus", () => {
            mediaplayer.focus();
        });
    });
}

function addPointerEventTransmitter(name: string) {
    mediaplayer.addEventListener("pointer" + name, (evt: PointerEvent) => {
        if (evt.clientY <= document.body.clientHeight - 42)
            touchpanel.dispatchEvent(copyPointerEvent(evt, "pointer" + name));
    });
}

function addKeyboardEventTransmitter(name: string) {
    mediaplayer.addEventListener("key" + name, (evt: KeyboardEvent) => {    
        switch (evt.key) {
            case "Left":
                if (mediaplayer.winControl.currentTime >= 10)
                    mediaplayer.winControl.currentTime -= 10;
                else
                    mediaplayer.winControl.currentTime = 0;
                break;
            case "Right":
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

function copyPointerEvent(evt: PointerEvent, name: string) {
    var newevt = <PointerEvent>document.createEvent("PointerEvent");
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
function play(evt: Event) {
    if (cursorTimerId)
        clearTimeout(cursorTimerId);
    cursorTimerId = setTimeout(() => {
        mediaplayer.style.cursor = "none";
    }, 3000);
}
function pause(evt: Event) {
    if (cursorTimerId)
        clearTimeout(cursorTimerId);
    mediaplayer.style.cursor = "auto";
}
function pointermove(evt: PointerEvent) {
    if (cursorTimerId)
        clearTimeout(cursorTimerId);
    mediaplayer.style.cursor = "auto";
    if (!mediaplayer.winControl.paused)
        cursorTimerId = setTimeout(() => {
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
function pointerdown(evt: PointerEvent) {
    if ((mediaplayer.winControl.readyState == 4) && (evt.pointerType !== "mouse" || evt.button == 0)) {
        prevPointerX = evt.clientX;
        prevTime = mediaplayer.winControl.currentTime;
        wasPaused = mediaplayer.winControl.paused;

        mediaplayer.winControl.pause();
    }
}
function pointerup(evt: PointerEvent) {
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
function isClick(moveX: number) {
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
    picker.fileTypeFilter.push(".3g2", ".3gp2", ".3gp", ".3gpp", ".m4v", ".mp4v", ".mp4", ".mov");
    picker.fileTypeFilter.push(".m2ts");
    picker.fileTypeFilter.push(".asf", ".wm", ".wmv");
    picker.fileTypeFilter.push(".avi");
    picker.fileTypeFilter.push(".smi", ".vtt", ".ttml");
    picker.pickMultipleFilesAsync().done(load);
}

function load(files: Windows.Foundation.Collections.IVectorView<Windows.Storage.StorageFile>) {
    var player = <HTMLMediaElement>mediaplayer.winControl.mediaElement;
    //var files = (<HTMLInputElement>evt.target).files;
    var videofile: File;
    var subfile: File;
    var samifile: File;
    for (var i = 0; i < files.length; i++) {
        var file = <File>files[i];
        switch (getFileExtension(file)) {
            case "smi":
                if (!subfile) samifile = file;
                break;
            case "vtt":
            case "ttml":
                if (!subfile) subfile = file;
                break;
            default:
                if (!videofile) videofile = file;
        }
        if (videofile && (subfile || samifile)) 
            break;
    }

    if (videofile) {
        //while ((<Array>mediaplayer.winControl.tracks).length > 0)
        //    URL.revokeObjectURL((<HTMLTrackElement><any>(<Array>mediaplayer.winControl.tracks).pop()).src);
        while (player.firstChild) {
            URL.revokeObjectURL((<HTMLTrackElement>player.firstChild).src);
            player.removeChild(player.firstChild);
        }
        if (subtitleString) subtitleString = '';
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
        exportButton.style.display = 'none';
    }
    else if (samifile) {
        subtitleFileDisplayName = getFileDisplayName(samifile);

        var loadSubtitle = (result: string) => {
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
                },
            ];
            mediaplayer.winControl.play();
            exportButton.style.display = 'inline-block';
        };
        var loadStyle = (resultStyle: HTMLStyleElement) => {
            if (style)
                document.head.removeChild(style);
            style = resultStyle;
            document.head.appendChild(resultStyle);
        }

        try {
            SamiTS.convertToWebVTTFromFile(samifile, loadSubtitle, { onstyleload: loadStyle });
        }
        catch (e) { new Windows.UI.Popups.MessageDialog("자막을 읽지 못했습니다.").showAsync(); }
    }
    else
        mediaplayer.winControl.play();
}

function getExtensionForSubType(subtype: SubType) {
    switch (subtype) {
        case SubType.WebVTT:
            return ".vtt";
        case SubType.SRT:
            return ".srt";
    }
}

function getMIMETypeForSubType(subtype: SubType) {
    switch (subtype) {
        case SubType.WebVTT:
            return "text/vtt";
        case SubType.SRT:
            return "text/plain";
    }
}

function getFileExtension(file: File) {
    var splitted = file.name.split('.');
    return splitted[splitted.length - 1].toLowerCase();
}

function getFileDisplayName(file: File) {
    var splitted = file.name.split('.');
    splitted = splitted.slice(0, splitted.length - 1);
    return splitted.join('.');
}

function exportSubtitle() {
    if (subtitleString) {
        var picker = new Windows.Storage.Pickers.FileSavePicker();
        picker.fileTypeChoices.insert("WebVTT", <any>[".vtt"]);
        picker.suggestedFileName = subtitleFileDisplayName;
        picker.pickSaveFileAsync().done((file: Windows.Storage.StorageFile) => {
            Windows.Storage.CachedFileManager.deferUpdates(file);
            (<any>Windows.Storage.FileIO.writeTextAsync(file, subtitleString)).done(() => {
                Windows.Storage.CachedFileManager.completeUpdatesAsync(file);
            });;
        })
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
    mediaplayer.winControl.onloadedmetadata = () => {
        mediaplayer.winControl.currentTime = currentTime;
        if (!paused)
            mediaplayer.winControl.play();
    }
}