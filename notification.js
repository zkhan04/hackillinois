
const _opt = {
    type: "basic",
    title: "Lock in time!",
    message: `Looks like you're off task. It's time to lock in!`,
    iconUrl: "url_to_small_icon"
  }

const _id = "lock-in-notification";

// const button = document.getElementById('enable-notifications');
// button.addEventListener('click', askForNotificationPermission);

// function askForNotificationPermission() {
//     chrome.permissions.request(
//       {
//         permissions: ["notifications"],
//       },
//       function (granted) {
//         if (granted) {
//           showNotification(_id, _opt);
//         } 
//       }
//     );

// }

async function showNotification(id, options) {
    if (Notification.permission === "granted") {
        await chrome.notifications.create(id, options);
    }
    
}
