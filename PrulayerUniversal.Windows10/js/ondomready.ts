declare var emptyStart: HTMLDivElement;
declare var startOpenButton: HTMLInputElement;
declare var mainVideo: PrulayerVideoElement;

interface PrulayerVideoElement extends HTMLElement {
    textTrackDelay: number;
    videoElement: HTMLVideoElement;
    controlBar: HTMLDivElement;
}
interface UserSliderElement extends HTMLInputElement {
    userEditMode: boolean;
}
interface HTMLTrackElementWithMediator extends HTMLTrackElement {
    mediator: TextTrackMediator;
}
interface TextTrackMediator {
    delay(milliseconds: number): void;
}

EventPromise.waitEvent(window, "DOMContentLoaded").then(() => {
    EventPromise.subscribeEvent(startOpenButton, "click", (ev, contract) => {
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
        picker.fileTypeFilter.push(
            ".3g2", ".3gp2", ".3gp", ".3gpp", ".m4v", ".mp4v", ".mp4", ".mov",
            ".m2ts",
            ".asf", ".wm", ".wmv",
            ".avi",
            ".mkv",
            ".smi", ".vtt", ".ttml");
        return picker.pickMultipleFilesAsync().then((files) => {
            if (!files.length)
                return;
            emptyStart.classList.add("hidden");
            mainVideo.classList.remove("hidden");
            <any>fileLoad(files);
        });
    });
    
    let toggleFullscreen = () => {
        let view = Windows.UI.ViewManagement.ApplicationView.getForCurrentView();

        if ((<any>view).isFullScreen)
            (<any>view).exitFullScreenMode();
        else
            (<any>view).tryEnterFullScreenMode();
    }

    EventPromise.subscribeEvent<KeyboardEvent>(window, "keydown", (ev, contract) => {
        if (ev.key !== "F11")
            return;
        toggleFullscreen();
    });
    EventPromise.subscribeEvent(mainVideo, "togglefullscreenrequested", (ev, contract) => {
        toggleFullscreen();
    });


    DOMTransform.register("prulayer-video", (pruVideo: PrulayerVideoElement) => {
        let mainVideo = <HTMLVideoElement>DOMLiner.element("video", { class: "main-video-element", id: "mainVideoElement" });
        let slider = <UserSliderElement>DOMTransform.extend(DOMLiner.element("input", { class: "time-slider", type: "range", step: 5 }), "user-slider");
        let statusDisplay = <HTMLDivElement>DOMLiner.element("div", { class: "video-status-display hidden" }, "Testing")

        mainVideo.addEventListener("loadedmetadata", () => slider.max = mainVideo.duration.toString());
        mainVideo.addEventListener("timeupdate", () => slider.value = mainVideo.currentTime.toString());
        slider.addEventListener("userinput", () => mainVideo.currentTime = slider.valueAsNumber);
        
        slider.addEventListener("pointerdown", () => mainVideo.pause());
        slider.addEventListener("keydown", () => mainVideo.pause());

        let textTrackDelay = 0;
        Object.defineProperty(pruVideo, "textTrackDelay", {
            get: () => textTrackDelay,
            set: (value: number) => {
                if (textTrackDelay === value || isNaN(value))
                    return;

                for (let child of Array.from(mainVideo.children)) {
                    if (child instanceof HTMLTrackElement) {
                        let {mediator} = <HTMLTrackElementWithMediator>child;
                        if (!mediator)
                            return;

                        mediator.delay(value - textTrackDelay);
                    }
                }

                textTrackDelay = value;
                pruVideo.dispatchEvent(new CustomEvent("texttrackdelayupdated")); // for display 
            }
        });

        Object.defineProperty(pruVideo, "videoElement", {
            get: () => mainVideo
        });

        pruVideo.appendChild(mainVideo);
        pruVideo.appendChild(statusDisplay);
        pruVideo.appendChild(
            DOMLiner.access(DOMLiner.element("div", { class: "video-element-cover", style: "cursor: none" }, [
                DOMLiner.access(DOMLiner.element("div", { class: "video-controller" }, [
                    DOMLiner.access(DOMLiner.element("span", null, "Play"), (element) => {
                        element.addEventListener("click", () => {
                            if (mainVideo.paused)
                                mainVideo.play();
                            else
                                mainVideo.pause();

                            mainVideo.addEventListener("play", () => element.textContent = "Pause");
                            mainVideo.addEventListener("pause", () => element.textContent = "Play");
                        });
                    }),
                    DOMLiner.access(DOMLiner.element("span", null, "Fullscreen"), (element) => {
                        element.addEventListener("click", () => pruVideo.dispatchEvent(new CustomEvent("togglefullscreenrequested")));
                    }),
                    slider
                ]), (controlBar) => {
                    Object.defineProperty(pruVideo, "controlBar", {
                        get: () => controlBar
                    });
                })
            ]), (videoElementCover: HTMLDivElement) => {

                // physical distance
                let isClick = (moveX: number) => (Math.abs(moveX) / screen.deviceXDPI < 0.04);
                // mouse cursor timer id
                let cursorTimerId: number;
                let cursorOn = () => {
                    videoElementCover.style.cursor = "auto";
                    if (cursorTimerId)
                        clearTimeout(cursorTimerId);
                    cursorTimerId = setTimeout(() => videoElementCover.style.cursor = "none", 3000);
                };

                let wasPaused = false;
                let prevPointerX: number = null;
                let prevTime: number = null;

                let displayTimerId: number;
                let displayText = (text: string) => {
                    if (displayTimerId)
                        clearTimeout(displayTimerId);
                    statusDisplay.textContent = text;
                    statusDisplay.classList.remove("hidden");

                    displayTimerId = setTimeout(() => {
                        statusDisplay.textContent = "";
                        statusDisplay.classList.add("hidden");
                    }, 3000);
                };

                mainVideo.addEventListener("seeked", () => displayText(`Time: ${mainVideo.currentTime}`));
                pruVideo.addEventListener("texttrackdelayupdated", () => displayText(`Text Track Delay: ${(pruVideo.textTrackDelay / 1000).toFixed(2)}`));

                videoElementCover.addEventListener("keydown", (ev) => {
                    if (ev.target !== videoElementCover)
                        return;

                    if (ev.ctrlKey) {
                        switch (ev.keyCode) {
                            case 188: /* , */
                                pruVideo.textTrackDelay -= 100;
                                return;
                            case 190: /* . */
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
                        case " ":
                            ev.preventDefault();
                            if (mainVideo.paused)
                                mainVideo.play();
                            else
                                mainVideo.pause();
                            return;
                        default:
                            return;
                    }
                });

                videoElementCover.addEventListener("wheel", (ev) => {
                    // minus value: control off
                    // plus value: control on
                    if (ev.deltaY > 0)
                        videoElementCover.style.cursor = "auto";
                    else if (ev.deltaY < 0)
                        videoElementCover.style.cursor = "none";
                })

                videoElementCover.addEventListener("pointerdown", (ev) => {
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
                videoElementCover.addEventListener("pointermove", (ev) => {
                    cursorOn();

                    // previous pointerdown check
                    if (prevPointerX == null)
                        return;

                    // non-click movement check
                    let difference = prevPointerX - ev.offsetX;
                    if (isClick(difference))
                        return;
                    
                    // navigation by mouse movement
                    mainVideo.pause();
                    mainVideo.currentTime = prevTime + difference / mainVideo.clientHeight * 10;
                });
                videoElementCover.addEventListener("pointerup", (ev) => {
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
            })
            );
    });

    DOMTransform.registerAsExtension("user-slider", "input", (userSlider: UserSliderElement) => {
        userSlider.userEditMode = false;
        let enableUserEditMode = () => { userSlider.userEditMode = true; console.log(userSlider.userEditMode) }
        let disableUserEditMode = () => { userSlider.userEditMode = false; console.log(userSlider.userEditMode) }

        userSlider.addEventListener("pointerdown", enableUserEditMode);
        userSlider.addEventListener("pointerup", disableUserEditMode);
        userSlider.addEventListener("keydown", enableUserEditMode);
        userSlider.addEventListener("keyup", disableUserEditMode);

        userSlider.addEventListener("input", (ev) => {
            if (userSlider.userEditMode)
                userSlider.dispatchEvent(new Event("userinput"));
        })
    });


    // <prulayer-video> element construction
    for (let pruVideo of Array.from(document.getElementsByTagName("prulayer-video")))
        DOMTransform.transform(pruVideo);


    mainVideo.controlBar.appendChild(DOMLiner.access(DOMLiner.element("span", null, "Open"), (element) => {
        element.addEventListener("click", () => {
            startOpenButton.click();
        });
    }));
});




/*
    <video class="main-video-element" id="mainVideoElement"></video>
    <div class="video-element-cover" id="videoElementCover">
        <div class="video-controller" id="videoController">
            <span>Play</span> <span>Pause</span> <input type="range" /> 
        </div>
    </div>
*/