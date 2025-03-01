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
          if (!data.timerEnd)
              return;
          const timeLeft = Math.max(0, Math.floor((data.timerEnd - Date.now()) / 1000));
          timerDisplay.textContent = `Time Left: ${timeLeft}s`;
          if (timeLeft > 0) {
              setTimeout(updateTimerDisplay, 1000);
          }
      });
  }
  updateTimerDisplay();

  // Get the toggle button
  const toggleButton = document.getElementById('toggle-btn');

  // Load the current state from Chrome storage
  chrome.storage.sync.get(['focusModeEnabled'], function (result) {
    const isEnabled = result.focusModeEnabled || false;
    updateButtonText(isEnabled);
  });

  // Toggle Focus Mode on button click
  toggleButton.addEventListener('click', () => {
    chrome.storage.sync.get(['focusModeEnabled'], function (result) {
      const isEnabled = result.focusModeEnabled || false;
      const newState = !isEnabled;

      // Save the new state to Chrome storage
      chrome.storage.sync.set({ focusModeEnabled: newState }, function () {
        updateButtonText(newState);
      });
    });
  });

  // Update the button text based on the current state
  function updateButtonText(isEnabled) {
    toggleButton.textContent = isEnabled ? 'Disable Focus Mode' : 'Enable Focus Mode';
  }
});
