declare var emptyStart: HTMLDivElement;
declare var startOpenButton: HTMLInputElement;
declare var mainVideo: HTMLDivElement;
declare var mainVideoElement: HTMLVideoElement;

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
    })

    DOMTransform.register("prulayer-video", (pruVideo) => {
        let mainVideo = <HTMLVideoElement>DOMLiner.element("video", { class: "main-video-element", id: "mainVideoElement" });
        let slider = <HTMLInputElement>DOMLiner.element("input", { type: "range" });
        let statusDisplay = <HTMLDivElement>DOMLiner.element("div", { class: "video-status-display hidden" }, "Testing")

        mainVideo.addEventListener("loadedmetadata", () => slider.max = mainVideo.duration.toString());
        mainVideo.addEventListener("timeupdate", () => slider.value = mainVideo.currentTime.toString());
        //mainVideo.ontimeupdate

        pruVideo.appendChild(mainVideo);
        pruVideo.appendChild(statusDisplay);
        pruVideo.appendChild(
            DOMLiner.access(DOMLiner.element("div", { class: "video-element-cover" }, [
                DOMLiner.element("div", { class: "video-controller" }, [
                    DOMLiner.access(DOMLiner.element("span", null, "Play"), (element) => {
                        element.addEventListener("click", () => mainVideo.play());
                    }),
                    DOMLiner.access(DOMLiner.element("span", null, "Pause"), (element) => {
                        element.addEventListener("click", () => mainVideo.pause());
                    }),
                    slider
                ])
            ]), (videoElementCover) => {
                videoElementCover.addEventListener("click", (ev) => {
                    if (ev.target !== videoElementCover)
                        return;
                    if (mainVideo.paused)
                        mainVideo.play();
                    else
                        mainVideo.pause();
                });
            })
            );
    });


    // <prulayer-video> element construction
    for (let pruVideo of Array.from(document.getElementsByTagName("prulayer-video")))
        DOMTransform.transform(pruVideo);
});




/*
    <video class="main-video-element" id="mainVideoElement"></video>
    <div class="video-element-cover" id="videoElementCover">
        <div class="video-controller" id="videoController">
            <span>Play</span> <span>Pause</span> <input type="range" /> 
        </div>
    </div>
*/