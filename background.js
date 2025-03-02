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

function calculateFinalStats(stats) {
  // Initialize stats object if it doesn't exist
  const safeStats = stats || { totalScore: 0, count: 0 };
  
  // Only show easter egg if literally no websites were visited
  if (safeStats.count === 0) {
    return {
      averageScore: 0,
      count: 0,
      message: "Were you browsing the Dark Web? You're like a ghost - we didn't track any sites! 👻",
      isEasterEgg: true
    };
  }
  
  const average = safeStats.totalScore / safeStats.count;
  const message = average >= 0.7 
    ? "Congrats! You stayed focused! 🎉" 
    : "Keep trying! You can do better next time!";
    
  return {
    averageScore: average,
    count: safeStats.count,
    message: message,
    isEasterEgg: false
  };
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
              const finalStats = calculateFinalStats(stats);
              
              chrome.storage.local.set({ finalStats: finalStats });
              chrome.storage.local.remove("sessionStats");
              
              // Notify popup and other parts that the session ended
              chrome.runtime.sendMessage({ 
                action: "sessionEnded",
                stats: finalStats
              });
              chrome.runtime.sendMessage("timer_finished"); // Notify popup if open
            });
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
    chrome.windows.create({
        url: chrome.runtime.getURL("notification.html"),
        type: "popup",
        width: 200,
        height: 200,
    });
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
        const finalStats = calculateFinalStats(stats);
        
        chrome.storage.local.set({ finalStats: finalStats });
        console.log("Sending sessionEnded message with finalStats:", finalStats);
        
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