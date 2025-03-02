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
      // Removed call to showPermission() since it's not defined.
    })
    .catch((error) => {
      console.log('Promise was rejected');
      console.log(error);
    });
}

async function showNotification() {
    console.log('Notification permission: ' + Notification.permission);
    if (Notification.permission === "granted") {
        chrome.runtime.sendMessage({ action: "showNotification" }, (response) => {
            console.log(response.status);
        });
    } else if (Notification.permission === "default") {
        requestPermission();
        if (Notification.permission === "granted") {
            chrome.runtime.sendMessage({ action: "showNotification" }, (response) => {
                console.log(response.status);
            });
        }
    }
}
