
const _opt = {
    type: "basic",
    title: "Lock in time!",
    message: `Looks like you're off task. It's time to lock in!`,
    iconUrl: "url_to_small_icon"
  }

const _id = "lock-in-notification";

// const button = document.getElementById('enable-notifications');
// button.addEventListener('click', askForNotificationPermission);

function askForNotificationPermission() {
  if (!("Notification" in window)) {
    // Check if the browser supports notifications
    alert("This browser does not support desktop notification");
  }  else if (Notification.permission !== "denied") {
    // We need to ask the user for permission
    Notification.requestPermission();
  }
}

async function showNotification() {  
    if (Notification.permission === "granted") {
        await chrome.notifications.create(_id, _opt);
    }
    
}
