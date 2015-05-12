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
    mainVideoElement.appendChild(DOMLiner.element("track", {
        kind: 'subtitles',
        src: URL.createObjectURL(blob, { oneTimeOnly: true }),
        default: true
    }));
}
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
            mainVideoElement.classList.remove("hidden");
            fileLoad(files);
        });
    });
});
//# sourceMappingURL=prulayerapp.js.map