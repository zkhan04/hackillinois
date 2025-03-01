let timerInterval = null;

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ timerEnd: null, timerPaused: null });
});

function startBackgroundTimer() {
    if (timerInterval) return; // Prevent multiple intervals

    timerInterval = setInterval(() => {
        chrome.storage.local.get(["timerEnd"], (data) => {
            if (!data.timerEnd) return;

            const timeLeftMilliseconds = Math.max(0, data.timerEnd - Date.now());

            if (timeLeftMilliseconds <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                chrome.storage.local.set({ timerEnd: null });
                chrome.runtime.sendMessage("timer_finished"); // Notify popup if open
            }
        });
    }, 1000);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message === "popup_opened") {
        startBackgroundTimer();
    } else if (message === "resume_timer") {
        startBackgroundTimer();
    } else if (message === "pause_timer") {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    sendResponse({ status: "received" }); // Avoid errors from missing responses
    return true; // Keeps the message port open
});