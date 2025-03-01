let timerInterval = null;

chrome.runtime.onMessage.addListener((message) => {
    if (message === "popup_opened") {
        startBackgroundTimer();
    } else if (message === "resume_timer") {
        startBackgroundTimer();
    }
});

function startBackgroundTimer() {
    if (timerInterval) return;

    timerInterval = setInterval(() => {
        chrome.storage.local.get("timerEnd", (data) => {
            if (!data.timerEnd) return;

            const timeLeftMilliseconds = Math.max(0, data.timerEnd - Date.now());

            if (timeLeftMilliseconds <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                chrome.storage.local.set({ timerEnd: null });
            }
        });
    }, 1000);
}