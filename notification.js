
const _opt = {
    type: "basic",
    title: "Lock in time!",
    message: `Looks like you're off task. It's time to lock in!`,
    iconUrl: "icon.png"
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

async function showNotification() {
    if (Notification.permission === "granted") {
        await chrome.notifications.create(_id, _opt);
    } else if (Notification.permission === "default") {
        requestPermission();
        if (Notification.permission === "granted") {
            await chrome.notifications.create(_id, _opt);
        }
    }
}
