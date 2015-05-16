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
        mainVideo.videoElement.src = URL.createObjectURL(videofile, { oneTimeOnly: true });
    }

    let sequence = Promise.resolve<HTMLTrackElementWithMediator>();
    if (subfile) {
        sequence = sequence.then(() => createTrackElement(subfile));
    }
    else if (samifile) {
        let samiDocument: SamiTS.SAMIDocument;
        
        sequence = Promise.resolve(FileIO.readTextAsync(samifile))
            .then((samistr) => SamiTS.createSAMIDocument(samistr))
            .then((samidoc) => {
                samiDocument = samidoc;
                return SamiTS.createWebVTT(samidoc);
            })
            .then((result) => {
                let track = <HTMLTrackElementWithMediator>createTrackElement(result.subtitle);

                track.mediator = {
                    delay(milliseconds) {
                        samiDocument.delay(milliseconds);
                        SamiTS.createWebVTT(samiDocument).then((result) =>
                            track.src = generateObjectURLFromTextTrackData(result.subtitle));
                    }
                };
                return track;
            });
    }

    sequence.then((track) => {
        if (track)
            insertTrack(track);
        mainVideo.videoElement.play();
    }).catch((error) => {
        debugger;
    });
}

function insertTrack(track: HTMLTrackElementWithMediator) {
    while (mainVideo.videoElement.firstChild)
        mainVideo.videoElement.removeChild(mainVideo.videoElement.firstChild);
    mainVideo.videoElement.appendChild(track);
}


function getFileExtension(file: StorageFile) {
    let splitted = file.name.split('.');
    return splitted[splitted.length - 1].toLowerCase();
} 

function createTrackElement(result: string|StorageFile) {
    let objectURL = generateObjectURLFromTextTrackData(result);
    
    return DOMLiner.element("track", {
        kind: 'subtitles',
        src: objectURL,
        default: true
    });
}

function generateObjectURLFromTextTrackData(data: string|StorageFile) {
    var blob: Blob;
    if (typeof data === "string")
        blob = getBlobFromText(data);
    else
        blob = <any>data;
    return URL.createObjectURL(blob, { oneTimeOnly: true });
}

function getBlobFromText(text: string) {
    return new Blob([text], { type: "text/vtt" });
}