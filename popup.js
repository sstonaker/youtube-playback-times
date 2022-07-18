document.addEventListener('DOMContentLoaded', function () {
    const runButton = document.querySelector('#target');
    // onClick's logic below:
    runButton.addEventListener('click', (event) => {
        chrome.runtime.sendMessage(document.querySelector('#api-key').value);
    });

});