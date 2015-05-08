declare var emptyStart: HTMLDivElement;
declare var startOpenButton: HTMLInputElement;
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
            mainVideoElement.classList.remove("hidden");
            <any>fileLoad(files);
        });
    })
});