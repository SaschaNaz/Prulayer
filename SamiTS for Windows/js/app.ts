///<reference path="winjs.d.ts" />
///<reference path="winrt.d.ts" />
///<reference path="SamiTS/SamiTS/samiconverter.ts" />
"use strict";

//declare var areaselector: HTMLButtonElement;
//declare var previewarea: HTMLDivElement;
declare var mediaplayer: HTMLDivElement;
//declare var player: HTMLVideoElement;
declare var appBar: any;
//declare var output: HTMLTextAreaElement;
var track: HTMLTrackElement;
var style: HTMLStyleElement;
//var isPreviewAreaShown = false;
var subtitleFileDisplayName: string;
var cursorTimerId: number;

enum SubType {
    WebVTT, SRT
}

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
function pointermove(evt: Event) {
    if (cursorTimerId)
        clearTimeout(cursorTimerId);
    mediaplayer.style.cursor = "auto";
    if (!mediaplayer.winControl.paused)
        cursorTimerId = setTimeout(() => {
            mediaplayer.style.cursor = "none";
        }, 3000);
}
function pointerdown(evt: MSPointerEvent) {
    if ((mediaplayer.winControl.readyState == 4) && (evt.pointerType !== "mouse" || evt.button != 2))
        if (mediaplayer.winControl.paused)
            mediaplayer.winControl.play();
        else
            mediaplayer.winControl.pause();
}

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
    if (!subfile)
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