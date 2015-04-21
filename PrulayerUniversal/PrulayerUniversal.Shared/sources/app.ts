"use strict";

declare var mediaplayer: HTMLDivElement;
declare var touchpanel: HTMLDivElement;
declare var exportButton: HTMLButtonElement;
declare var flagButton: HTMLButtonElement;
declare var openButton: HTMLButtonElement;

import StorageFile = Windows.Storage.StorageFile;
import FileIO = Windows.Storage.FileIO;

var style: HTMLStyleElement;

var samiDocument: SamiTS.SAMIDocument;
var subtitleFileDisplayName: string;
var cursorTimerId: number;
var prevPointerX = -1;
var prevTime = -1;
var wasPaused = false;

enum SubType {
    WebVTT, SubRip
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
    mediaplayer.addEventListener("keydown", receiveKeyboardInput);
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

function copyPointerEvent(evt: PointerEvent, name: string) {
    var newevt = <PointerEvent>document.createEvent("PointerEvent");
    newevt.initPointerEvent(name, evt.bubbles, evt.cancelable, evt.view, evt.detail, evt.screenX, evt.screenY, evt.clientX, evt.clientY, evt.ctrlKey, evt.altKey, evt.shiftKey, evt.metaKey, evt.button, evt.relatedTarget, evt.offsetX, evt.offsetY, evt.width, evt.height, evt.pressure, evt.rotation, evt.tiltX, evt.tiltY, evt.pointerId, evt.pointerType, evt.hwTimestamp, evt.isPrimary);
    return newevt;
}

function receiveKeyboardInput(evt: KeyboardEvent) {
    if (!samiDocument || !evt.ctrlKey)
        return;
    switch (evt.keyCode) {
        case 188:
            samiDocument.delay(-100);
            break;
        case 190:
            samiDocument.delay(100);
            break;
        default:
            return;
    }
    
    return SamiTS.createWebVTT(samiDocument, { createStyleElement: true })
        .then((result) => {
            loadSubtitle(result.subtitle);
            loadStyle(result.stylesheet);
        });
}

WinJS.UI.eventHandler(play);
WinJS.UI.eventHandler(pause);
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
    picker.fileTypeFilter.push(
        ".3g2", ".3gp2", ".3gp", ".3gpp", ".m4v", ".mp4v", ".mp4", ".mov",
        ".m2ts",
        ".asf", ".wm", ".wmv",
        ".avi",
        ".mkv",
        ".smi", ".vtt", ".ttml");
    return picker.pickMultipleFilesAsync().then(load);
}

function load(files: Windows.Foundation.Collections.IVectorView<Windows.Storage.StorageFile>) {
    if (files.length == 0)
        return;
    
    var player = <HTMLMediaElement>mediaplayer.winControl.mediaElement;
    //var files = (<HTMLInputElement>evt.target).files;
    var videofile: StorageFile;
    var subfile: StorageFile;
    var samifile: StorageFile;
    for (var i = 0; i < files.length; i++) {
        var file: Windows.Storage.StorageFile = files.getAt(i);
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
        if (samiDocument) samiDocument = null;
        if (mediaplayer.winControl.src)
            URL.revokeObjectURL(mediaplayer.winControl.src);
        mediaplayer.winControl.src = URL.createObjectURL(videofile);
    }
    if (subfile) {
        loadSubtitle(subfile);

        mediaplayer.winControl.play();
        exportButton.style.display = 'none';
    }
    else if (samifile) {
        subtitleFileDisplayName = getFileDisplayName(samifile);
        
        Promise.resolve(<Promise<string>><any>FileIO.readTextAsync(samifile))
            .then((samistr) => SamiTS.createSAMIDocument(samistr))
            .then((samidoc) => {
                samiDocument = samidoc;
                return SamiTS.createWebVTT(samidoc, { createStyleElement: true })
            })
            .then((result) => {
                loadSubtitle(result.subtitle);
                loadStyle(result.stylesheet);

                mediaplayer.winControl.play();
                exportButton.style.display = 'inline-block';
            })
            .catch((error) => {
                if (error.message)
                    new Windows.UI.Popups.MessageDialog("자막을 읽지 못했습니다.\r\n\r\nMessage: " + error.message).showAsync();
                else
                    new Windows.UI.Popups.MessageDialog("자막을 읽지 못했습니다.").showAsync();
            });
    }
    else
        mediaplayer.winControl.play();
}

function getExtensionForSubType(subtype: SubType) {
    switch (subtype) {
        case SubType.WebVTT:
            return ".vtt";
        case SubType.SubRip:
            return ".srt";
    }
}

function getMIMETypeForSubType(subtype: SubType) {
    switch (subtype) {
        case SubType.WebVTT:
            return "text/vtt";
        case SubType.SubRip:
            return "text/plain";
    }
}

function getFileExtension(file: StorageFile) {
    var splitted = file.name.split('.');
    return splitted[splitted.length - 1].toLowerCase();
}

function getFileDisplayName(file: StorageFile) {
    var splitted = file.name.split('.');
    splitted = splitted.slice(0, splitted.length - 1);
    return splitted.join('.');
}

function loadSubtitle(result: string): void;
function loadSubtitle(result: StorageFile): void;
function loadSubtitle(result: any) {
    var blob: Blob;
    if (typeof result === "string")
        blob = new Blob([result], { type: "text/vtt" });
    else
        blob = result;

    mediaplayer.winControl.tracks = [
        {
            kind: 'subtitles',
            src: URL.createObjectURL(blob, { oneTimeOnly: true }),
            default: true
        },
    ];
}

function loadStyle(resultStyle: HTMLStyleElement) {
    if (style)
        document.head.removeChild(style);
    style = resultStyle;
    document.head.appendChild(resultStyle);
}

function exportSubtitle() {
    if (samiDocument) {
        var picker = new Windows.Storage.Pickers.FileSavePicker();
        picker.fileTypeChoices.insert("WebVTT", <any>[".vtt"]);
        picker.suggestedFileName = subtitleFileDisplayName;

        var result: SamiTS.SamiTSResult;
        var file: StorageFile;
        SamiTS.createWebVTT(samiDocument)
            .then((_result) => {
                result = _result;
                return <Promise<StorageFile>><any>picker.pickSaveFileAsync()
            })
            .then((_file: StorageFile) => {
                file = _file;
                Windows.Storage.CachedFileManager.deferUpdates(file);
                return FileIO.writeTextAsync(file, result.subtitle)
            })
            .then(() => <Promise<Windows.Storage.Provider.FileUpdateStatus>><any>Windows.Storage.CachedFileManager.completeUpdatesAsync(file));
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
