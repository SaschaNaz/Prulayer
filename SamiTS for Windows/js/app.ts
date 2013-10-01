///<reference path="winjs.d.ts" />
///<reference path="winrt.d.ts" />
///<reference path="SamiTS/SamiTS/samiconverter.ts" />
"use strict";

interface PointerEvent extends MSPointerEvent {
}

//declare var areaselector: HTMLButtonElement;
//declare var previewarea: HTMLDivElement;
declare var mediaplayer: HTMLDivElement;
declare var touchpanel: HTMLDivElement;
var slider: HTMLInputElement;
//declare var player: HTMLVideoElement;
//declare var output: HTMLTextAreaElement;
var track: HTMLTrackElement;
var style: HTMLStyleElement;
//var isPreviewAreaShown = false;
var subtitleFileDisplayName: string;
var cursorTimerId: number;
var keyboardTimerStarterId: number;
var keyboardTimerId: number;
var prevPointerX = -1;
var prevTime = -1;

enum SubType {
    WebVTT, SRT
}

function domContentLoad() {
    addPointerEventTransmitter("down");
    addPointerEventTransmitter("up");
    addPointerEventTransmitter("move");
    addKeyboardEventTransmitter("down");
    WinJS.UI.processAll().done(() => {
        slider = <HTMLInputElement>mediaplayer.querySelector("[title=Seek]").getElementsByTagName("input")[0];
        slider.focus();
        mediaplayer.addEventListener("focus", () => {
            slider.focus();
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

function copyPointerEvent(evt: PointerEvent, name: string) {
    var newevt = document.createEvent("PointerEvent");
    (<any>newevt).initPointerEvent(name, true, true, evt.view, evt.detail, evt.screenX, evt.screenY, evt.clientX, evt.clientY, evt.ctrlKey, evt.altKey, evt.shiftKey, evt.metaKey, evt.button, evt.relatedTarget, evt.offsetX, evt.offsetY, evt.width, evt.height, evt.pressure, evt.rotation, evt.tiltX, evt.tiltY, evt.pointerId, evt.pointerType, evt.hwTimestamp, evt.isPrimary);
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
        if (Math.abs(differ) / screen.deviceXDPI < 0.04)
            return;
        mediaplayer.winControl.pause();
        mediaplayer.winControl.currentTime = prevTime + differ / document.body.clientHeight * 10;
    }
}
function pointerdown(evt: PointerEvent) {
    if ((mediaplayer.winControl.readyState == 4) && (evt.pointerType !== "mouse" || evt.button == 0)) {
        prevPointerX = evt.clientX;
        prevTime = mediaplayer.winControl.currentTime;
    }
}
function pointerup(evt: PointerEvent) {
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

function load(evt: Event) {
    var player: HTMLVideoElement = mediaplayer.getElementsByTagName("video")[0];
    var files = (<HTMLInputElement>evt.target).files;
    var videofile: File;
    var subfile: File;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (!videofile && player.canPlayType(file.type)) //mediaplayer.winControl.canPlayType(file.type))
            videofile = file;
        else if (!subfile && getFileExtension(file) === "smi")
            subfile = file;
        if (videofile && subfile)
            break;
    }
    if (!videofile)
        return;

    subtitleFileDisplayName = getFileDisplayName(subfile);
    var resultOutput = (result: string) => {
        //hidePreviewArea();
        //hidePlayer();
        //hideAreaSelector();
        //output.value = result;
        if (track) {
            player.removeChild(track); (<HTMLButtonElement>document.getElementById("areaselector"))
            mediaplayer.winControl.src = '';
            //player.src = '';
        }
        if (videofile) {
            mediaplayer.winControl.src = URL.createObjectURL(videofile);
            //player.src = URL.createObjectURL(videofile);
            track = document.createElement("track");
            track.label = "日本語";
            track.kind = "subtitles";
            track.srclang = "ja";
            track.src = URL.createObjectURL(new Blob([result], { type: "text/vtt" }));
            track.default = true;
            player.appendChild(track);
            mediaplayer.winControl.play();
            //showAreaSelector();
            //showPlayer();
        }
        //else
        //    showPreviewArea();
    };

    return SamiTS.convertToWebVTTFromFile(subfile, resultOutput,
        (resultStyle: HTMLStyleElement) => {
            if (style)
                document.head.removeChild(style);
            style = resultStyle;
            document.head.appendChild(resultStyle);
        });

    //SamiTS.convertFromFile(subfile, getTargetSubType(), getTagUse(), (result: string) => {
    //    hidePreviewArea();
    //    hidePlayer();
    //    hideAreaSelector();
    //    output.value = result;
    //    if (track) {
    //        player.removeChild(track); (<HTMLButtonElement>document.getElementById("areaselector"))
    //        player.src = '';
    //    }
    //    if (videofile) {
    //        player.src = URL.createObjectURL(videofile);
    //        track = document.createElement("track");
    //        track.label = "日本語";
    //        track.kind = "subtitles";
    //        track.srclang = "ja";
    //        track.src = URL.createObjectURL(new Blob([result], { type: "text/vtt" }));
    //        track.default = true;
    //        player.appendChild(track);
    //        showAreaSelector();
    //        showPlayer();
    //    }
    //    else
    //        showPreviewArea();
    //});
}

//function selectArea() {
//    if (isPreviewAreaShown) {
//        hidePreviewArea();
//        showPlayer();
//    }
//    else {
//        hidePlayer();
//        showPreviewArea();
//    }
//}

//function showAreaSelector() {
//    areaselector.style.display = "inline-block";
//}
//function hideAreaSelector() {
//    areaselector.style.display = "none";
//}
//function showPreviewArea() {
//    previewarea.style.display = "inline-block";
//    isPreviewAreaShown = true;
//    areaselector.value = "Play";
//}
//function hidePreviewArea() {
//    previewarea.style.display = "none";
//    isPreviewAreaShown = false;
//}
//function showPlayer() {
//    //player.style.display = "inline-block";
//    areaselector.value = "Preview";
//}
//function hidePlayer() {
//    //player.style.display = "none";
//}

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