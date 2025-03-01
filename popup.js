document.addEventListener("DOMContentLoaded", () => {
  const timeInput = document.getElementById("timeInput");
  const startButton = document.getElementById("startTimer");
  const pauseAndResumeButton = document.getElementById("pauseOrResumeTimer");
  const timerDisplay = document.getElementById("timerDisplay");

  let timerRunning = false;
  let timerInterval = null;

  startButton.addEventListener("click", () => {
    const time = parseInt(timeInput.value);
    if (isNaN(time) || time <= 0) return;

    // Set the timer end time
    chrome.storage.local.set({ timerEnd: Date.now() + time * 60000 });
    
    // Start the timer
    if (!timerRunning) {
      timerRunning = true;
      updateTimerDisplay();  // Immediately update the timer display
    }

    // Disable start button, enable pause/resume button
    startButton.disabled = true;
    pauseAndResumeButton.disabled = false;
    pauseAndResumeButton.textContent = "Pause";  // Initially, show "Pause"
  });

  pauseAndResumeButton.addEventListener("click", () => {
    if (timerRunning) {
      // Pause the timer
      clearInterval(timerInterval);
      timerRunning = false;
      pauseAndResumeButton.textContent = "Resume";  // Change button to "Resume"
    } else {
      // Resume the timer
      timerRunning = true;
      pauseAndResumeButton.textContent = "Pause";  // Change button to "Pause"

      // Calculate the remaining time from the stored end time
      chrome.storage.local.get("timerEnd", (data) => {
        if (!data.timerEnd) return;

        const timeLeftMilliseconds = Math.max(0, data.timerEnd - Date.now());
        chrome.storage.local.set({ timerEnd: Date.now() + timeLeftMilliseconds });

        // Continue updating the timer display
        updateTimerDisplay();
      });
    }
  });

  function updateTimerDisplay() {
    chrome.storage.local.get("timerEnd", (data) => {
      if (!data.timerEnd) return;

      const timeLeftMilliseconds = Math.max(0, data.timerEnd - Date.now());
      const timeLeftSeconds = Math.floor(timeLeftMilliseconds / 1000);
      const minutesLeft = Math.floor(timeLeftSeconds / 60);  // Full minutes
      const secondsLeft = timeLeftSeconds % 60;  // Remaining seconds

      // Update the display
      timerDisplay.textContent = `Time Left: ${minutesLeft}m ${secondsLeft}s`;

      // Continue updating if the timer is still running
      if (timeLeftSeconds > 0 && timerRunning) {
        // Set the interval for every second if it's not already set
        if (!timerInterval) {
          timerInterval = setInterval(() => {
            updateTimerDisplay();  // Update the display every second
          }, 1000);
        }
      } else {
        // Timer ends, clear the interval
        clearInterval(timerInterval);
        timerInterval = null;
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
