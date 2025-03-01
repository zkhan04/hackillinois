let timerInterval = null;

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ timerEnd: null });
});

// Keep updating the time left in storage every second
function startBackgroundTimer() {
    if (timerInterval) return; // Prevent multiple intervals

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

// Listen for popup opening and ensure the timer is running
chrome.runtime.onMessage.addListener((message) => {
    if (message === "popup_opened") {
        startBackgroundTimer();
    }
});