///<reference path="winjs.d.ts" />
///<reference path="winrt.d.ts" />
///<reference path="SamiTS/SamiTS/samiconverter.ts" />
"use strict";
//declare var output: HTMLTextAreaElement;
var track;
var style;

//var isPreviewAreaShown = false;
var subtitleFileDisplayName;
var cursorTimerId;

var SubType;
(function (SubType) {
    SubType[SubType["WebVTT"] = 0] = "WebVTT";
    SubType[SubType["SRT"] = 1] = "SRT";
})(SubType || (SubType = {}));

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
}
function pointerdown(evt) {
    if ((mediaplayer.winControl.readyState == 4) && (evt.pointerType !== "mouse" || evt.button != 2))
        if (mediaplayer.winControl.paused)
            mediaplayer.winControl.play();
else
            mediaplayer.winControl.pause();
}

function load(evt) {
    var player = mediaplayer.getElementsByTagName("video")[0];
    var files = (evt.target).files;
    var videofile;
    var subfile;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (!videofile && player.canPlayType(file.type))
            videofile = file;
else if (!subfile && getFileExtension(file) === "smi")
            subfile = file;
        if (videofile && subfile)
            break;
    }
    if (!videofile)
        return;

    subtitleFileDisplayName = getFileDisplayName(subfile);
    var resultOutput = function (result) {
        if (track) {
            player.removeChild(track);
            (document.getElementById("areaselector"));
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

    return SamiTS.convertToWebVTTFromFile(subfile, resultOutput, function (resultStyle) {
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
//# sourceMappingURL=app.js.map
