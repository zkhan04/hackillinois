"use strict";
document.addEventListener("DOMContentLoaded", () => {
    const timeInput = document.getElementById("timeInput");
    const startButton = document.getElementById("startTimer");
    const timerDisplay = document.getElementById("timerDisplay");
    startButton.addEventListener("click", () => {
        const time = parseInt(timeInput.value);
        if (isNaN(time) || time <= 0)
            return;
        // sets a timer, time*60000 because Date.now() is in milliseconds and time is in minutes
        chrome.storage.local.set({ timerEnd: Date.now() + time * 60000 });
        chrome.alarms.create("countdown", { delayInMinutes: time });
        updateTimerDisplay();
    });
    function updateTimerDisplay() {
        chrome.storage.local.get("timerEnd", (data) => {
            const timeLeft = Math.max(0, Math.floor((data.timerEnd - Date.now()) / 1000));
            timerDisplay.textContent = `Time Left: ${timeLeft}s`;
            if (timeLeft > 0) {
                setTimeout(updateTimerDisplay, 1000);
            }
        });
    }
    updateTimerDisplay();
});
