document.addEventListener("DOMContentLoaded", () => {
    const timeInput = document.getElementById("timeInput") as HTMLInputElement;
    const startButton = document.getElementById("startTimer") as HTMLButtonElement;
    const timerDisplay = document.getElementById("timerDisplay") as HTMLParagraphElement;

    startButton.addEventListener("click", () => {
        const time = parseInt(timeInput.value);
        if (isNaN(time) || time <= 0) return;

        // sets a timer, time*60000 because Date.now() is in milliseconds and time is in minutes
        chrome.storage.local.set({ timerEnd: Date.now() + time * 60000 });

        chrome.alarms.create("countdown", { delayInMinutes: time });

        updateTimerDisplay();
    });

    function updateTimerDisplay() {
        chrome.storage.local.get("timerEnd", (data) => {
            if (!data.timerEnd) return;

            const timeLeft = Math.max(0, Math.floor((data.timerEnd - Date.now()) / 60000));
            timerDisplay.textContent = `Time Left: ${timeLeft}min`;

            if (timeLeft > 0) {
                setTimeout(updateTimerDisplay, 1000);
            }

            console.log("Current time:", Date.now());
            console.log("Timer end time:", data.timerEnd);
        });
        
    }

    updateTimerDisplay();
});