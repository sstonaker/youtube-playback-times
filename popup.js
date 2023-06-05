document.addEventListener("DOMContentLoaded", function () {
  const runButton = document.querySelector("#target");
  // onClick's logic below:
  runButton.addEventListener("click", (event) => {
    chrome.runtime.sendMessage(document.querySelector("#api-key").value);
  });

  chrome.runtime.onMessage.addListener(function (message) {
    displayMessage(message);
  });

  function displayMessage(message) {
    let messageArea = document.querySelector("#message");
    messageArea.innerHTML = message;
  }
});
