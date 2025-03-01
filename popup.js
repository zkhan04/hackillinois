document.addEventListener("DOMContentLoaded", () => {
  const timeInput = document.getElementById("timeInput");
  const startButton = document.getElementById("startTimer");
  const pauseButton = document.getElementById("pauseTimer");
  const resumeButton = document.getElementById("resumeTimer");
  const timerDisplay = document.getElementById("timerDisplay");

  let timerRunning = false;

  // Notify background script that popup is open
  chrome.runtime.sendMessage("popup_opened");

  function hideStart() {
    document.getElementById("timerStart").style.display = "none";
}
  
  // Restore button states when popup opens
  chrome.storage.local.get(["timerEnd", "timerRunning"], (data) => {
      if (data.timerRunning) {
          timerRunning = true;
          startButton.disabled = true;
          pauseButton.disabled = false;
          resumeButton.disabled = true;
      } else {
          startButton.disabled = false;
          pauseButton.disabled = true;
          resumeButton.disabled = false;
      }
      updateTimerDisplay();
  });

  startButton.addEventListener("click", () => {
      const time = parseInt(timeInput.value);
      if (isNaN(time) || time <= 0) return;

      const timerEnd = Date.now() + time * 60000;
      chrome.storage.local.set({ timerEnd, timerPaused: null });

      timerRunning = true;
      updateTimerDisplay();
      startButton.disabled = true;
      pauseButton.disabled = false;
      resumeButton.disabled = true;
  });

  pauseButton.addEventListener("click", () => {
      if (timerRunning) {
          chrome.storage.local.get("timerEnd", (data) => {
              if (!data.timerEnd) return;

              const timeLeftMilliseconds = Math.max(0, data.timerEnd - Date.now());
              chrome.storage.local.set({ timerPaused: timeLeftMilliseconds, timerEnd: null });

              chrome.runtime.sendMessage("pause_timer");
          });

          timerRunning = false;
          startButton.disabled = false;
          pauseButton.disabled = true;
          resumeButton.disabled = false;
      }
  });

  resumeButton.addEventListener("click", () => {
      if (!timerRunning) {
          chrome.storage.local.get("timerPaused", (data) => {
              if (!data.timerPaused) return;

              const newEndTime = Date.now() + data.timerPaused;
              chrome.storage.local.set({ timerEnd: newEndTime, timerPaused: null });

              chrome.runtime.sendMessage("resume_timer");
              updateTimerDisplay();
          });

          timerRunning = true;
          pauseButton.disabled = false;
          resumeButton.disabled = true;
      }
  });

  function updateTimerDisplay() {
      chrome.storage.local.get(["timerEnd"], (data) => {
          if (!data.timerEnd) return;

          const timeLeftMilliseconds = Math.max(0, data.timerEnd - Date.now());
          const timeLeftSeconds = Math.floor(timeLeftMilliseconds / 1000);
          const minutesLeft = Math.floor(timeLeftSeconds / 60);
          const secondsLeft = timeLeftSeconds % 60;

          timerDisplay.textContent = `Time Left: ${minutesLeft}m ${secondsLeft}s`;

          // Keep updating every second while popup is open
          setTimeout(updateTimerDisplay, 1000);
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
