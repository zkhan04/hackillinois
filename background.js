let timerInterval = null;

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ timerEnd: null, timerRunning: false });
});

function startBackgroundTimer() {
    if (timerInterval) return; // Prevent multiple intervals

    chrome.storage.local.set({ timerRunning: true });

    timerInterval = setInterval(() => {
        chrome.storage.local.get("timerEnd", (data) => {
            if (!data.timerEnd) return;

            const timeLeftMilliseconds = Math.max(0, data.timerEnd - Date.now());

            if (timeLeftMilliseconds <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                chrome.storage.local.set({ timerEnd: null, timerRunning: false });
                chrome.storage.local.remove("topic");
                chrome.storage.local.remove("topicList");
                chrome.storage.local.set({focusModeEnabled: false});
                chrome.runtime.sendMessage("timer_finished"); // Notify popup if open
            }
        });
    }, 1000);
}

chrome.runtime.onMessage.addListener((message) => {
    if (message === "popup_opened") {
        startBackgroundTimer(); // Ensure the timer continues running
    } else if (message === "resume_timer") {
        startBackgroundTimer(); // Resume the timer
    } else if (message === "pause_timer") {
        clearInterval(timerInterval);
        timerInterval = null;
        chrome.storage.local.set({ timerRunning: false });
    }
});