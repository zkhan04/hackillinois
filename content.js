console.log("Current URL:", window.location.href);
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

function createNotification() {
    // const img = "/to-do-notifications/img/icon-128.png";
    const text = `Looks like you're off task. It's time to lock in!`;
    const notification = new Notification("Lock in time!", {body: text});
}
