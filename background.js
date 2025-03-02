let timerInterval = null;

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ timerEnd: null, timerRunning: false });
});

function startBackgroundTimer() {
    if (timerInterval) return; // Prevent multiple intervals

    chrome.storage.local.set({ timerRunning: true });

    timerInterval = setInterval(() => {
        checkTimer();
    }, 1000);
}

function checkTimer() {
    chrome.storage.local.get("timerEnd", (data) => {
        if (!data.timerEnd) return;

        const timeLeftMilliseconds = Math.max(0, data.timerEnd - Date.now());

        if (timeLeftMilliseconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            chrome.storage.local.set({ timerEnd: null, timerRunning: false });
            chrome.storage.local.remove("topic");
            chrome.storage.local.remove("topicList");
            chrome.storage.local.set({ focusModeEnabled: false });
            // Compute final stats
            chrome.storage.local.get("sessionStats", (data) => {
              const stats = data.sessionStats || { totalScore: 0, count: 0 };
              const average = stats.count > 0 ? stats.totalScore / stats.count : 0;
              const message = average >= 0.7 
                ? "Congrats! You stayed focused! 🎉" 
                : "Keep trying! You can do better next time!";
              chrome.storage.local.set({ finalStats: { averageScore: average, count: stats.count, message } });
              // Optionally clear sessionStats
              chrome.storage.local.remove("sessionStats");
            });
            // Notify popup and other parts that the session ended
            chrome.runtime.sendMessage({ action: "sessionEnded" });
            chrome.runtime.sendMessage("timer_finished"); // Notify popup if open
        }
    });
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
    const _opt = {
      type: "basic",
      title: "Lock in time!",
      message: `Looks like you're off task. It's time to lock in!`,
      iconUrl: "icon.png"
    };
    const _id = "lock-in-notification";
    chrome.notifications.create(_id, _opt);
    sendResponse({status: "notification shown"});
  }
});

// Update the session start handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request === "session_start") {
    console.log("New session starting, initializing stats");
    chrome.storage.local.set({ sessionStats: { totalScore: 0, count: 0 } });
    // Clear any previous session results
    chrome.storage.local.remove("finalStats");
    
    if (sendResponse) sendResponse({ status: "session started" });
  }
});

// Listen to recordScore messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "recordScore") {
    chrome.storage.local.get("sessionStats", (data) => {
      const stats = data.sessionStats || { totalScore: 0, count: 0 };
      stats.totalScore += request.score;
      stats.count += 1;
      chrome.storage.local.set({ sessionStats: stats });
      
      // Forward the message to any open popups for real-time updates
      chrome.runtime.sendMessage({
        action: "recordScore", 
        score: request.score,
        currentStats: stats
      });
    });
  }
});

// Update the end_session handler to ensure sync with UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === "end_session") {
    console.log("Session ending manually");
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    chrome.storage.local.set({ timerEnd: null, timerRunning: false });
    chrome.storage.sync.set({ focusModeEnabled: false });
    
    // Compute final stats with a small delay to ensure all scores are recorded
    setTimeout(() => {
      chrome.storage.local.get("sessionStats", (data) => {
        const stats = data.sessionStats || { totalScore: 0, count: 0 };
        const average = stats.count > 0 ? stats.totalScore / stats.count : 0;
        const finalMsg = average >= 0.7 
          ? "Congrats! You stayed focused! 🎉" 
          : "Keep trying! You can do better next time!";
        
        const finalStats = { 
          averageScore: average, 
          count: stats.count, 
          message: finalMsg 
        };
        
        chrome.storage.local.set({ finalStats: finalStats });
        console.log("Sending sessionEnded message with finalStats:", finalStats);
        
        // Send message with the stats directly included
        chrome.runtime.sendMessage({ 
          action: "sessionEnded",
          stats: finalStats
        });
        
        chrome.storage.local.remove("sessionStats");
        chrome.storage.local.remove("topic");
        chrome.storage.local.remove("topicList");
        
        if (sendResponse) sendResponse({ status: "session ended" });
      });
    }, 500);
    
    return true; // Required for async sendResponse
  }
});