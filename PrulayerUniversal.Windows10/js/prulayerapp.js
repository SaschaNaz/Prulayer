EventPromise.waitEvent(window, "DOMContentLoaded").then(function () {
    EventPromise.subscribeEvent(startOpenButton, "click", function (ev, contract) {
        var input = document.createElement("input");
        input.type = "file";
        input.click();
    });
});
//# sourceMappingURL=prulayerapp.js.map