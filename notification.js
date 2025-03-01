
const _opt = {
    type: "basic",
    title: "Lock in time!",
    message: `Looks like you're off task. It's time to lock in!`,
    iconUrl: "url_to_small_icon"
  }

const _id = "lock-in-notification";

function askForNotificationPermission() {
    if (!("Notification" in window)) {
        console.log("This browser does not support notifications.");
        return;
      }
      Notification.requestPermission().then((permission) => {
        // set the button to shown or hidden, depending on what the user answers
        enableNotifications.style.display = permission === "granted" ? "none" : "block";
      });
}

async function showNotification() {  
    if (Notification.permission === "granted") {
        await chrome.notifications.create(_id, _opt);
    }
    
}
