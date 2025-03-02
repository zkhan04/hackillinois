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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showNotification") {
    chrome.windows.create({
        url: chrome.runtime.getURL("notification.html"),
        type: "popup",
        width: 200,
        height: 200,
    });
    sendResponse({status: "notification shown"});
  }
});