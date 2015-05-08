import StorageFile = Windows.Storage.StorageFile;
import FileIO = Windows.Storage.FileIO;

function fileLoad(files: Windows.Foundation.Collections.IVectorView<StorageFile>) {
    if (!files.length)
        return;

    let videofile: StorageFile;
    let subfile: StorageFile;
    let samifile: StorageFile;
    for (let file of Array.from<StorageFile>(<any>files)) {
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
        //if (samiDocument) samiDocument = null;
        mainVideoElement.src = URL.createObjectURL(videofile, { oneTimeOnly: true });
    }
    if (subfile) {
        loadSubtitle(subfile);
        mainVideoElement.play();
    }
    else if (samifile) {
        Promise.resolve(FileIO.readTextAsync(samifile))
            .then((samistr) => SamiTS.createWebVTT(samistr))
            .then((result) => {
                loadSubtitle(result.subtitle);

                mainVideoElement.play();
            }).catch((error) => {
                debugger;
            });
    }
}
function getFileExtension(file: StorageFile) {
    let splitted = file.name.split('.');
    return splitted[splitted.length - 1].toLowerCase();
} 

function loadSubtitle(result: string): void;
function loadSubtitle(result: StorageFile): void;
function loadSubtitle(result: any) {
    var blob: Blob;
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