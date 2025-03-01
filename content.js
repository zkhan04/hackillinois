(async function () {
	console.log("Does this thing even work?")
    const lockinMode = await chrome.storage.sync.get("focusModeEnabled");

    if (lockinMode.focusModeEnabled) {
        // do locked in stuff ig
        console.log("index script called!");

        (function () {
            const body = document.querySelector("body");

            if (!body) {
                console.log("body not found!");
                return;
            }

            console.log("logging all webpage text now:");
            const allText = body.innerText;
            console.log(allText);
        })();
    } else {
		console.log("not locked in");
	}
})();


