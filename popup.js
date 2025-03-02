const BASE_URL = 'http://127.0.0.1:1234/';
const LLM_MODEL = 'llama-3.2-3b-instruct';

document.addEventListener("DOMContentLoaded", () => {
  activateTimer();
  activateToggleButton();
  activateTopicSubmission();
  activateEndSessionButton(); // Ensure the "End Session" button is hooked up

  loadState();
  addMessageListeners();
});

function loadState() {
  // Check for final stats on popup load
  chrome.storage.local.get("finalStats", (data) => {
    if (data.finalStats) {
      console.log("Found finalStats on load", data.finalStats);
      updateStatsUI(data.finalStats);
    }
  });

  // Retain topic input value if previously set
  chrome.storage.local.get("topic", (data) => {
    if (data.topic) {
      document.getElementById("intopic").value = data.topic;
    }
  });
}

function addMessageListeners(){
  // Listen for all messages with debug logs
  chrome.runtime.onMessage.addListener((message) => {
    console.log("Popup received message:", message);
    

    if (message.action === "sessionEnded") {
      if (message.stats) {
        console.log("Received stats directly in message:", message.stats);
        updateStatsUI(message.stats);
      } else {
        chrome.storage.local.get("finalStats", (data) => {
          if (data.finalStats) {
            console.log("Fetched finalStats from storage:", data.finalStats);
            updateStatsUI(data.finalStats);
          } else {
            console.log("No finalStats found in storage.");
          }
        });
      }
    } 
    // Add handling for recordScore messages to update UI in real-time
    else if (message.action === "recordScore") {
      chrome.storage.local.get("sessionStats", (data) => {
        if (data.sessionStats) {
          console.log("Updating UI with current sessionStats", data.sessionStats);
          const stats = data.sessionStats;
          const average = stats.count > 0 ? stats.totalScore / stats.count : 0;
          
          // Create a temporary stats object for real-time display
          const currentStats = {
            averageScore: average,
            count: stats.count,
            message: average >= 0.7 ? "Looking good! Keep it up!" : "Try to stay on topic"
          };
          
          updateStatsUI(currentStats);
        }
      });
    }
  });
}

// LLM Interaction

/**
 * Generates a structured list of 20+ relevant topics based on a given user topic.
 *
 * The goal is to create a broader context to help determine whether a webpage is relevant to the user's interest.
 *
 * Output Format: topic: string (Original user topic), description: string (Brief summary of the topic), list_of_topics: array (20+ relevant subtopics, each containing a short keyword-based description with exactly 5 keywords).
 * @param {string} topic - User-provided topic to generate relevant subtopics for.
 * @param {string} custom_instruction - Custom instruction string to pass to the LLM model.
 * @returns {Promise<object>} - A Promise of the generated topic list. The resolved object should have the following keys: topic (string), description (string), list_of_topics (array of objects). Each subtopic object should have the following keys: topic (string), description (string). If the promise is rejected, the error should be logged to the console.
 */
const generateTopicList = async (topic, custom_instruction) => {
	// Construct the prompt using pageContent and topic.
	const user_prompt = `topic: ${topic}`;
  console.log('generating topic list');
	try {
		const response = await fetch(`${BASE_URL}api/v0/chat/completions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [
                    { "role": "system", "content": "Do not add any human-like explanations, just provide the structured data output."},
                    { "role": "system", "content": custom_instruction},
                    { "role": "user", "content": user_prompt}
                ],
                response_format: {
                    "type": "json_schema",
                    "json_schema": {
                      "name": "relavency",
                      "strict": "true",
                      "schema": {
                        "type": "object",
                        "properties": {
                            "topic": {
                                "type": "string"
                            },
                            "description": {
                                "type": "string"
                            },
                            "list_of_topics": {
                                "type": "array"
                            }
                        },
                      "required": ["topic", "description", "list_of_topics"]
                      }
                    }
                },
                model: LLM_MODEL,
				max_tokens: -1
			})
		});
		if (!response.ok) throw new Error('Failed to get completions');
		return await response.json();
	} catch (err) {
		console.error(err);
		return null;
	}
};

const storeTopic = async (response) => {
	try {
		await chrome.storage.local.set({ topic: response });
	} catch (err) {
		console.error('Failed to store LLM response', err);
	}
};

const storeTopicList = async (response) => {
	try {
		await chrome.storage.local.set({ topicList: response });
	} catch (err) {
		console.error('Failed to store LLM response', err);
	}
};


// ------------ FRONTEND STUFF ---------------

const activateTopicSubmission = () => {
  const topicInput = document.getElementById("intopic");
  const topicButton = document.getElementById("submitTopic");
  const loaderContainer = document.getElementById("loaderContainer");


  topicButton.addEventListener("click", async() => {
    const topic = topicInput.value;
    if (!topic.trim()) return;
    
    console.log(topic);
    
    // Show loading animation
    topicButton.disabled = true;
    loaderContainer.style.display = "block";
    
    // Store the topic first
    await storeTopic(topic);
    
    // Generate topic list with LLM
    const instruction = "Your task is to generate a structured list of 20+ relevant topics based on a given user topic. The goal is to create a broader context to help determine whether a webpage is relevant to the user's interest. | Output Format: topic: string (Original user topic), description: string (Brief summary of the topic), list_of_topics: array (20+ relevant subtopics, each containing a short keyword-based description with exactly 5 keywords). | Guidelines: - Expand the given topic by identifying closely related subtopics, concepts, or terminologies. - Include synonyms, industry-specific jargon, and alternative ways the topic may be discussed. - If applicable, provide different perspectives (e.g., academic, technical, casual, industry use cases). - Prioritize topics that are likely to appear on webpages that genuinely cover the subject. - Do not generate overly broad or generic topics—keep them directly relevant. - Ensure that each subtopic in list_of_topics has an accompanying 5-keyword description that concisely represents its core concept. - Do not generate explanations, summaries, or commentary beyond the specified format.";
    try {
      const response = await generateTopicList(topic, instruction);
      const llmContent = response['choices'][0]['message']['content'];
      await storeTopicList(llmContent);
      console.log('stored topic list:', llmContent);  
      
      // Show success indication
      topicInput.style.borderColor = "green";
      setTimeout(() => {
        topicInput.style.borderColor = "";
      }, 2000);
    } catch (error) {
      console.error("Error generating topic list:", error);
      // Show error indication
      topicInput.style.borderColor = "red";
      setTimeout(() => {
        topicInput.style.borderColor = "";
      }, 2000);
    } finally {
      // Hide loading animation
      loaderContainer.style.display = "none";
      topicButton.disabled = false;
    }
  });
  
  // Allow pressing Enter in the input field to submit
  topicInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      topicButton.click();
    }

  });
  
}

const activateTimer = () => {
  const timeInput = document.getElementById("timeInput");
  const startButton = document.getElementById("startTimer");
  const pauseButton = document.getElementById("pauseTimer");
  const resumeButton = document.getElementById("resumeTimer");
  const timerDisplay = document.getElementById("timerDisplay");

  let timerRunning = false;
  pauseButton.disabled = true;

  // Notify background script that popup is open
  chrome.runtime.sendMessage("popup_opened");
  
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
      chrome.storage.local.set({ timerEnd, timerPaused: null, timerRunning: true });

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
              chrome.storage.local.set({ timerPaused: timeLeftMilliseconds, timerEnd: null, timerRunning: false });

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
              chrome.storage.local.set({ timerEnd: newEndTime, timerPaused: null, timerRunning: true });

              chrome.runtime.sendMessage("resume_timer");
              updateTimerDisplay();
          });

          timerRunning = true;
          pauseButton.disabled = false;
          resumeButton.disabled = true;
      }
  });

  function updateTimerDisplay() {
      chrome.storage.local.get(["timerEnd", "timerPaused"], (data) => {
          if (data.timerEnd) {
              const timeLeftMilliseconds = Math.max(0, data.timerEnd - Date.now());
              const timeLeftSeconds = Math.floor(timeLeftMilliseconds / 1000);
              const minutesLeft = Math.floor(timeLeftSeconds / 60);
              const secondsLeft = timeLeftSeconds % 60;
              timerDisplay.textContent = `Time Left: ${minutesLeft}m ${secondsLeft}s`;
              if (timeLeftMilliseconds > 0) {
                  setTimeout(updateTimerDisplay, 1000);
              } else {
                  timerDisplay.textContent = "Time's up!";
                  startButton.disabled = false;
                  pauseButton.disabled = true;
                  resumeButton.disabled = true;
                  timerRunning = false;
              }
          } else if (data.timerPaused) {
              const pausedTime = data.timerPaused;
              const timeLeftSeconds = Math.floor(pausedTime / 1000);
              const minutesLeft = Math.floor(timeLeftSeconds / 60);
              const secondsLeft = timeLeftSeconds % 60;
              timerDisplay.textContent = `Paused: ${minutesLeft}m ${secondsLeft}s`;
          } else {
              timerDisplay.textContent = "Time Left: --";
          }
      });
  }

  updateTimerDisplay();
}

const activateToggleButton = () => {
  // Get the toggle button and level selector
  const toggleButton = document.getElementById('toggle-btn');
  const levelSelector = document.getElementById('level');
  const tooltipContainer = document.getElementById('levelTooltipContainer');

  // Load the current state from Chrome storage
  chrome.storage.sync.get(['focusModeEnabled', 'focusLevel'], function (result) {
    const isEnabled = result.focusModeEnabled || false;
    const currentLevel = result.focusLevel || 'easy';
    
    // Set default selection to the stored level or 'easy'
    for(let i = 0; i < levelSelector.options.length; i++) {
      if(levelSelector.options[i].value === currentLevel) {
        levelSelector.selectedIndex = i;
        break;
      }
    }
    
    // Toggle level selector disabled state based on focus mode
    levelSelector.disabled = isEnabled;
    
    // Only show tooltip when the mode is actually disabled
    tooltipContainer.classList.toggle('has-tooltip', isEnabled);
    
    updateButtonText(isEnabled);
  });

  // Toggle Focus Mode on button click
  toggleButton.addEventListener('click', () => {
    chrome.storage.sync.get(['focusModeEnabled'], function (result) {
      const isEnabled = result.focusModeEnabled || false;
      const newState = !isEnabled;
      const selectedLevel = levelSelector.value || 'easy';

      if (newState) {
        // Starting a new focus session
        chrome.runtime.sendMessage("session_start");
        // Save the selected focus level
        chrome.storage.sync.set({ focusLevel: selectedLevel });
        // Disable the level selector during active session
        levelSelector.disabled = true;
        // Show tooltip for disabled selector
        tooltipContainer.classList.add('has-tooltip');
        // Clear any previous session stats display
        const statsContainer = document.getElementById("statsContainer");
        if (statsContainer) statsContainer.innerHTML = '';
      } else {
        // Ending the session - compute and show stats
        chrome.runtime.sendMessage("end_session");
        // Re-enable the level selector when session ends
        levelSelector.disabled = false;
        // Hide tooltip when selector is enabled
        tooltipContainer.classList.remove('has-tooltip');
      }

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
}

function updateStatsUI(finalStats) {
  const statsContainer = document.getElementById("statsContainer");
  if (statsContainer) {
    if (finalStats.isEasterEgg) {
      // Easter egg display for when no sites were visited
      statsContainer.innerHTML = `
        <h3>Session Summary</h3>
        <div class="easter-egg">
          <p style="font-size: 24px;">👻</p>
          <p>${finalStats.message}</p>
        </div>
      `;
      statsContainer.style.animation = "ghost-float 3s infinite ease-in-out";
    } else {
      // Normal stats display
      statsContainer.innerHTML = `
        <h3>Session Summary</h3>
        <p>Evaluated websites: ${finalStats.count}</p>
        <p>Average Focus Score: ${(finalStats.averageScore * 100).toFixed(1)}%</p>
        <p>${finalStats.message}</p>
      `;
      // Trigger simple confetti simulation if score is high
      if (finalStats.averageScore >= 0.7) {
        statsContainer.style.animation = "confetti 2s ease-out";
        setTimeout(() => statsContainer.style.animation = "", 2000);
      }
    }
  }
}

function activateEndSessionButton() {
  const endButton = document.getElementById("endSessionButton");
  if (endButton) {
    endButton.addEventListener("click", () => {
      chrome.runtime.sendMessage("end_session", (response) => {
        console.log(response.status);
      });
    });
  }
}
