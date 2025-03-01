document.addEventListener("DOMContentLoaded", () => {
  const timeInput = document.getElementById("timeInput");
  const startButton = document.getElementById("startTimer");
  const pauseButton = document.getElementById("pauseTimer");
  const resumeButton = document.getElementById("resumeTimer");
  const timerDisplay = document.getElementById("timerDisplay");

  let timerRunning = false;
  let timeRemaining = 0; // Store the remaining time when paused
  let timerInterval = null;

  startButton.addEventListener("click", () => {
      const time = parseInt(timeInput.value);
      if (isNaN(time) || time <= 0)
          return;
      // sets a timer, time*60000 because Date.now() is in milliseconds and time is in minutes
      chrome.storage.local.set({ timerEnd: Date.now() + time * 60000 });
      chrome.alarms.create("countdown", { delayInMinutes: time });
      
      if(timerRunning == false){
        timerRunning = true;
      }
      updateTimerDisplay();

      startButton.disabled = true;
      pauseButton.disabled = false;
      resumeButton.disabled = true;
  });

  pauseButton.addEventListener("click", () => {
      if (timerRunning) {
        clearInterval(timerInterval); 
        timerRunning = false;
        startButton.disabled = false; 
        pauseButton.disabled = true; 
        resumeButton.disabled = false; 
      }
  });

  resumeButton.addEventListener("click", () => {
    if (!timerRunning) {
        timerRunning = true;
        chrome.storage.local.get("timerEnd", (data) => {
            if (!data.timerEnd) return;

            const timeLeftMilliseconds = Math.max(0, data.timerEnd - Date.now());
            chrome.storage.local.set({ timerEnd: Date.now() + timeLeftMilliseconds });

            updateTimerDisplay();
        });

        pauseButton.disabled = false;
        resumeButton.disabled = true; 
    }
});

  function updateTimerDisplay() {
      chrome.storage.local.get("timerEnd", (data) => {
          if (!data.timerEnd)
              return;

          const timeLeftSeconds = Math.max(0, Math.floor((data.timerEnd - Date.now()) / 1000));
          const minutesLeft = Math.floor(timeLeftSeconds / 60); // Get the number of full minutes
          const secondsLeft = timeLeftSeconds % 60; // Get the remaining seconds

          timerDisplay.textContent = `Time Left: ${minutesLeft}m ${secondsLeft}s`;
          
          if (timeLeftSeconds > 0 && timerRunning) {
              timerInterval = setInterval(updateTimerDisplay, 1000);
          } else {
              // Timer ends
              clearInterval(timerInterval);  
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
