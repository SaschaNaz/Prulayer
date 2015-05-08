declare var startOpenButton: HTMLInputElement;

EventPromise.waitEvent(window, "DOMContentLoaded").then(() => {
    EventPromise.subscribeEvent(startOpenButton, "click", (ev, contract) => {
        let input = document.createElement("input");
        input.type = "file";
        input.click();
    });
});