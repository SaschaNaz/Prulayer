var StorageFile = Windows.Storage.StorageFile;
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
    while (mainVideoElement.firstChild)
        mainVideoElement.removeChild(mainVideoElement.firstChild);
    mainVideoElement.appendChild(DOMLiner.element("track", {
        kind: 'subtitles',
        src: URL.createObjectURL(blob, { oneTimeOnly: true }),
        default: true,
        "prop-mediator": { delay: function (milliseconds) { } }
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
    EventPromise.subscribeEvent(window, "keydown", function (ev, contract) {
        if (ev.key !== "F11")
            return;
        var view = Windows.UI.ViewManagement.ApplicationView.getForCurrentView();
        if (view.isFullScreen)
            view.exitFullScreenMode();
        else
            view.tryEnterFullScreenMode();
    });
    DOMTransform.register("prulayer-video", function (pruVideo) {
        var mainVideo = DOMLiner.element("video", { class: "main-video-element", id: "mainVideoElement" });
        var slider = DOMTransform.extend(DOMLiner.element("input", { class: "time-slider", type: "range", step: 5 }), "user-slider");
        var statusDisplay = DOMLiner.element("div", { class: "video-status-display hidden" }, "Testing");
        mainVideo.addEventListener("loadedmetadata", function () { return slider.max = mainVideo.duration.toString(); });
        mainVideo.addEventListener("timeupdate", function () { return slider.value = mainVideo.currentTime.toString(); });
        slider.addEventListener("userinput", function () { return mainVideo.currentTime = slider.valueAsNumber; });
        slider.addEventListener("pointerdown", function () { return mainVideo.pause(); });
        slider.addEventListener("keydown", function () { return mainVideo.pause(); });
        var textTrackDelay = 0;
        Object.defineProperty(pruVideo, "textTrackDelay", {
            get: function () { return textTrackDelay; },
            set: function (value) {
                if (textTrackDelay === value || isNaN(value))
                    return;
                for (var _i = 0, _a = Array.from(mainVideo.children); _i < _a.length; _i++) {
                    var child = _a[_i];
                    if (child instanceof HTMLTrackElement) {
                        var mediator = child.mediator;
                        if (!mediator)
                            return;
                        mediator.delay(value);
                    }
                }
                textTrackDelay = value;
                pruVideo.dispatchEvent(new CustomEvent("texttrackdelayupdated")); // for display 
            }
        });
        pruVideo.appendChild(mainVideo);
        pruVideo.appendChild(statusDisplay);
        pruVideo.appendChild(DOMLiner.access(DOMLiner.element("div", { class: "video-element-cover", style: "cursor: none" }, [
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
            // physical distance
            var isClick = function (moveX) { return (Math.abs(moveX) / screen.deviceXDPI < 0.04); };
            // mouse cursor timer id
            var cursorTimerId;
            var cursorOn = function () {
                videoElementCover.style.cursor = "auto";
                if (cursorTimerId)
                    clearTimeout(cursorTimerId);
                cursorTimerId = setTimeout(function () { return videoElementCover.style.cursor = "none"; }, 3000);
            };
            var wasPaused = false;
            var prevPointerX = null;
            var prevTime = null;
            var displayTimerId;
            var displayText = function (text) {
                if (displayTimerId)
                    clearTimeout(displayTimerId);
                statusDisplay.textContent = text;
                statusDisplay.classList.remove("hidden");
                displayTimerId = setTimeout(function () {
                    statusDisplay.textContent = "";
                    statusDisplay.classList.add("hidden");
                }, 3000);
            };
            mainVideo.addEventListener("seeked", function () { return displayText("Time: " + mainVideo.currentTime); });
            pruVideo.addEventListener("texttrackdelayupdated", function () { return displayText("Text Track Delay: " + (pruVideo.textTrackDelay / 1000).toFixed(2)); });
            videoElementCover.addEventListener("keydown", function (ev) {
                if (ev.target !== videoElementCover)
                    return;
                if (ev.ctrlKey) {
                    switch (ev.keyCode) {
                        case 188:
                            pruVideo.textTrackDelay -= 100;
                            return;
                        case 190:
                            pruVideo.textTrackDelay += 100;
                            return;
                        default:
                            return;
                    }
                }
                if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.shiftKey)
                    return;
                switch (ev.key) {
                    case "Left":
                    case "ArrowLeft":
                        mainVideo.currentTime -= 5;
                        return;
                    case "Right":
                    case "ArrowRight":
                        mainVideo.currentTime += 5;
                        return;
                    default:
                        return;
                }
            });
            videoElementCover.addEventListener("wheel", function (ev) {
                // minus value: control off
                // plus value: control on
                if (ev.deltaY > 0)
                    videoElementCover.style.cursor = "auto";
                else if (ev.deltaY < 0)
                    videoElementCover.style.cursor = "none";
            });
            videoElementCover.addEventListener("pointerdown", function (ev) {
                if (ev.target !== videoElementCover)
                    return;
                if (mainVideo.readyState === 4 && ev.button === 0) {
                    videoElementCover.setPointerCapture(ev.pointerId);
                    prevPointerX = ev.offsetX;
                    prevTime = mainVideo.currentTime;
                    wasPaused = mainVideo.paused;
                    mainVideo.pause();
                }
            });
            videoElementCover.addEventListener("pointermove", function (ev) {
                cursorOn();
                // previous pointerdown check
                if (prevPointerX == null)
                    return;
                // non-click movement check
                var difference = prevPointerX - ev.offsetX;
                if (isClick(difference))
                    return;
                // navigation by mouse movement
                mainVideo.pause();
                mainVideo.currentTime = prevTime + difference / mainVideo.clientHeight * 10;
            });
            videoElementCover.addEventListener("pointerup", function (ev) {
                if (prevPointerX == null)
                    return;
                if (isClick(prevPointerX - ev.offsetX)) {
                    if (wasPaused)
                        mainVideo.play();
                    else
                        mainVideo.pause();
                }
                prevPointerX = prevTime = null;
                wasPaused = false;
            });
        }));
    });
    DOMTransform.registerAsExtension("user-slider", "input", function (userSlider) {
        userSlider.userEditMode = false;
        var enableUserEditMode = function () { userSlider.userEditMode = true; console.log(userSlider.userEditMode); };
        var disableUserEditMode = function () { userSlider.userEditMode = false; console.log(userSlider.userEditMode); };
        userSlider.addEventListener("pointerdown", enableUserEditMode);
        userSlider.addEventListener("pointerup", disableUserEditMode);
        userSlider.addEventListener("keydown", enableUserEditMode);
        userSlider.addEventListener("keyup", disableUserEditMode);
        userSlider.addEventListener("input", function (ev) {
            if (userSlider.userEditMode)
                userSlider.dispatchEvent(new Event("userinput"));
        });
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