import StorageFile = Windows.Storage.StorageFile;
import FileIO = Windows.Storage.FileIO;

async function fileLoad(files: Windows.Foundation.Collections.IVectorView<StorageFile>) {
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

    let track: HTMLTrackElementWithMediator;
    if (subfile) {
        track = createTrackElement(subfile);
    }
    else if (samifile) {
        const samistr = await FileIO.readTextAsync(samifile);
        const samidoc = await SamiTS.createSAMIDocument(samistr);
        const result = await SamiTS.createWebVTT(samidoc);

        const trackWithMediator = createTrackElement(result.subtitle) as HTMLTrackElementWithMediator;
        trackWithMediator.mediator = {
            async delay(milliseconds) {
                const newDocument = samidoc.clone();
                newDocument.delay(milliseconds);
                const result = await SamiTS.createWebVTT(newDocument);
                trackWithMediator.src = generateObjectURLFromTextTrackData(result.subtitle);
                trackWithMediator.timedelay = milliseconds;
            }
        };
        track = trackWithMediator;
    }

    if (track) {
        insertTrack(track);
    }
    mainVideo.videoElement.play();
}

function insertTrack(track: HTMLTrackElementWithMediator) {
    while (mainVideo.videoElement.firstChild) {
        mainVideo.videoElement.removeChild(mainVideo.videoElement.firstChild);
    }
    mainVideo.videoElement.appendChild(track);
}


function getFileExtension(file: StorageFile) {
    let splitted = file.name.split('.');
    return splitted[splitted.length - 1].toLowerCase();
}

function createTrackElement(result: string | StorageFile) {
    const objectURL = generateObjectURLFromTextTrackData(result);

    return DOMLiner.element<HTMLTrackElement>("track", {
        kind: 'subtitles',
        src: objectURL,
        default: true
    });
}

function generateObjectURLFromTextTrackData(data: string | StorageFile) {
    var blob: Blob;
    if (typeof data === "string") {
        blob = getBlobFromText(data);
    }
    else {
        blob = <any>data;
    }
    return URL.createObjectURL(blob, { oneTimeOnly: true });
}

function getBlobFromText(text: string) {
    return new Blob([text], { type: "text/vtt" });
}