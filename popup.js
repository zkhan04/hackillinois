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
