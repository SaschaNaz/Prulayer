﻿var StorageFile = Windows.Storage.StorageFile;
var FileIO = Windows.Storage.FileIO;
function fileLoad(files) {
    if (!files.length)
        return;
    var videofile;
    var subfile;
    var samifile;
    for (var _i = 0, _a = Array.from(files); _i < _a.length; _i++) {
        var file = _a[_i];
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
        //if (samiDocument) samiDocument = null;
        mainVideoElement.src = URL.createObjectURL(videofile, { oneTimeOnly: true });
    }
    if (subfile) {
        loadSubtitle(subfile);
        mainVideoElement.play();
    }
    else if (samifile) {
        Promise.resolve(FileIO.readTextAsync(samifile))
            .then(function (samistr) { return SamiTS.createWebVTT(samistr); })
            .then(function (result) {
            loadSubtitle(result.subtitle);
            mainVideoElement.play();
        }).catch(function (error) {
            debugger;
        });
    }
}
function getFileExtension(file) {
    var splitted = file.name.split('.');
    return splitted[splitted.length - 1].toLowerCase();
}
function loadSubtitle(result) {
    var blob;
    if (typeof result === "string")
        blob = new Blob([result], { type: "text/vtt" });
    else
        blob = result;
    mainVideoElement.appendChild(DOMLiner.element("track", {
        kind: 'subtitles',
        src: URL.createObjectURL(blob, { oneTimeOnly: true }),
        default: true
    }));
}
var DOMTransform;
(function (DOMTransform) {
    var dictionary = {};
    function register(tagName, process) {
        dictionary[tagName.toLowerCase()] = { process: process };
    }
    DOMTransform.register = register;
    function registerAsExtension(extensionName, base, process) {
        base = base.toLowerCase();
        dictionary[extensionName.toLowerCase()] = { process: process, base: base };
    }
    DOMTransform.registerAsExtension = registerAsExtension;
    function construct(registeredName) {
        registeredName = registeredName.toLowerCase();
        var transformer = dictionary[registeredName];
        var element = document.createElement(transformer.base || registeredName);
        transformer.process(element);
        return element;
    }
    DOMTransform.construct = construct;
    function transform(blankElement) {
        if (blankElement instanceof Element) {
            var tagName = blankElement.tagName.toLowerCase();
            var transformer = dictionary[tagName];
            if (!transformer)
                throw new Error("No transformer is registered to treat " + tagName);
            transformer.process(blankElement);
            return blankElement;
        }
        throw new Error("The input is not an Element.");
    }
    DOMTransform.transform = transform;
    function extend(baseElement, extensionName) {
        if (baseElement instanceof Element) {
            extensionName = extensionName.toLowerCase();
            var transformer = dictionary[extensionName];
            if (!transformer)
                throw new Error("No transformer is registered to treat " + extensionName);
            // base coincidence check
            var baseTagName = baseElement.tagName.toLowerCase();
            if (transformer.base !== baseTagName)
                throw new Error("The input base element is not instance of " + baseTagName);
            transformer.process(baseElement);
            return baseElement;
        }
        throw new Error("The input is not an Element.");
    }
    DOMTransform.extend = extend;
})(DOMTransform || (DOMTransform = {}));
EventPromise.waitEvent(window, "DOMContentLoaded").then(function () {
    EventPromise.subscribeEvent(startOpenButton, "click", function (ev, contract) {
        //let input = document.createElement("input");
        //input.type = "file";
        //input.multiple = true;
        //input.click();
        //input.onchange = () => {
        //    if (!input.files.length)
        //        return;
        //    emptyStart.classList.add("hidden");
        //    mainVideoElement.classList.remove("hidden");
        //    fileLoad(input.files)
        //};
        var picker = new Windows.Storage.Pickers.FileOpenPicker();
        picker.fileTypeFilter.push(".3g2", ".3gp2", ".3gp", ".3gpp", ".m4v", ".mp4v", ".mp4", ".mov", ".m2ts", ".asf", ".wm", ".wmv", ".avi", ".mkv", ".smi", ".vtt", ".ttml");
        return picker.pickMultipleFilesAsync().then(function (files) {
            if (!files.length)
                return;
            emptyStart.classList.add("hidden");
            mainVideo.classList.remove("hidden");
            fileLoad(files);
        });
    });
    DOMTransform.register("prulayer-video", function (pruVideo) {
        var mainVideo = DOMLiner.element("video", { class: "main-video-element", id: "mainVideoElement" });
        var slider = DOMLiner.element("input", { class: "time-slider", type: "range" });
        var statusDisplay = DOMLiner.element("div", { class: "video-status-display hidden" }, "Testing");
        mainVideo.addEventListener("loadedmetadata", function () { return slider.max = mainVideo.duration.toString(); });
        mainVideo.addEventListener("timeupdate", function () { return slider.value = mainVideo.currentTime.toString(); });
        //mainVideo.ontimeupdate
        pruVideo.appendChild(mainVideo);
        pruVideo.appendChild(statusDisplay);
        pruVideo.appendChild(DOMLiner.access(DOMLiner.element("div", { class: "video-element-cover" }, [
            DOMLiner.element("div", { class: "video-controller" }, [
                DOMLiner.access(DOMLiner.element("span", null, "Play"), function (element) {
                    element.addEventListener("click", function () { return mainVideo.play(); });
                }),
                DOMLiner.access(DOMLiner.element("span", null, "Pause"), function (element) {
                    element.addEventListener("click", function () { return mainVideo.pause(); });
                }),
                slider
            ])
        ]), function (videoElementCover) {
            videoElementCover.addEventListener("click", function (ev) {
                if (ev.target !== videoElementCover)
                    return;
                if (mainVideo.paused)
                    mainVideo.play();
                else
                    mainVideo.pause();
            });
        }));
    });
    DOMTransform.register("user-slider", function (userSlider) {
        userSlider;
    });
    // <prulayer-video> element construction
    for (var _i = 0, _a = Array.from(document.getElementsByTagName("prulayer-video")); _i < _a.length; _i++) {
        var pruVideo = _a[_i];
        DOMTransform.transform(pruVideo);
    }
});
/*
    <video class="main-video-element" id="mainVideoElement"></video>
    <div class="video-element-cover" id="videoElementCover">
        <div class="video-controller" id="videoController">
            <span>Play</span> <span>Pause</span> <input type="range" />
        </div>
    </div>
*/ 
//# sourceMappingURL=prulayerapp.js.map