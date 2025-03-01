
const _opt = {
    type: "basic",
    title: "Lock in time!",
    message: `Looks like you're off task. It's time to lock in!`,
    // iconUrl: "url_to_small_icon"
  }

const _id = "lock-in-notification";

function requestPermission() {
  Notification.requestPermission()
    .then((permission) => {
      console.log('Promise resolved: ' + permission);
      showPermission();
    })
    .catch((error) => {
      console.log('Promise was rejected');
      console.log(error);
    });
}

async function showNotification(id, options) {
    if (Notification.permission === "granted") {
        await chrome.notifications.create(id, options);
    } else if (Notification.permission === "default") {
        requestPermission();
        if (Notification.permission === "granted") {
            await chrome.notifications.create(id, options);
        }
    }
}
