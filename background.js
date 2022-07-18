const TEST_URL = "https://www.youtube.com/watch?v=9bZkp7q19f0"
const YT_PREFIX = "https://www.youtube.com/watch?v="
const YT_API_PREFIX = "https://www.googleapis.com/youtube/v3/videos?id="
const YT_API_OPTIONS = "&part=contentDetails&part=snippet&key="

chrome.runtime.onInstalled.addListener(function () {
    console.log("Youtube Video Playback Times Loaded");
});


chrome.runtime.onMessage.addListener(
    function (keyFromPopup) {
        verifyAPI_KEY(keyFromPopup)
    }
);

function keyError() {
    console.log("API KEY Error")
}


function verifyAPI_KEY(keyFromPopup) {
    API_INPUT = keyFromPopup
    if (API_INPUT) {
        const TEST_API = `${YT_API_PREFIX}9bZkp7q19f0&part=contentDetails&key=${API_INPUT}`
        fetch(TEST_API).then((response) => {
            console.log(response.status);
            console.log(response.ok);
            if (response.status == 200 && response.ok == true) {
                console.log("ok");
                runScript(API_INPUT);
            }
            // This returns a promise, so we will process the json
        }).catch((e) => {
            console.log(`API KEY ERROR ${e}`);
        })
        // runScript(API_INPUT.value);
    } else {
        keyError();
    };
}

function runScript(API_KEY) {


    var bookmarks = new Array();            // This will be all of our bookmarks
    var ytVideoBookmarks = new Array();     // This will be our youtube video bookmarks


    // Get the bookmarks from the node, if it has children, it is a bookmark folder, so run recursively
    function fetch_bookmarks(parentNode) {
        parentNode.forEach(function (bookmark) {

            // Filter out any bad urls
            if (!(bookmark.url === undefined || bookmark.url === null)) {
                bookmarks.push(bookmark);
            }
            if (bookmark.children) {
                fetch_bookmarks(bookmark.children);
            }
        });
    }


    // Get the node from chrome, populate the bookmarks, then get the video bookmarks
    chrome.bookmarks.getTree(function (rootNode) {
        fetch_bookmarks(rootNode);
        getVideoId(bookmarks);
    });


    // Get the video's ID by checking it's url and selecting the 11 digit ID
    // Create an API link with the ID and append it to the bookmark, then add
    // that to our video bookmarks array
    function getVideoId(bookmarks) {
        bookmarks.forEach(function (bookmark) {
            if (bookmark.url.startsWith(`${YT_PREFIX}`)) { // insert TEST_URL vs (YT_PREFIX) here to reduce API calls for testing
                const vidId = bookmark.url.substring(32, 43);
                bookmark.videoId = vidId;
                const LINK = `${YT_API_PREFIX}${vidId}${YT_API_OPTIONS}${API_KEY}`;
                bookmark.API_LINK = LINK;
                ytVideoBookmarks.push(bookmark);
            }
        });
        getVideoDetails(ytVideoBookmarks);
        console.log(ytVideoBookmarks);
    }


    // Request the video details (contentDetails) and title (snippet) from YouTube's API
    function getVideoDetails(ytVideoBookmarks) {
        ytVideoBookmarks.forEach(function (bookmark) {

            //This returns a promise, so we will process the json in a chained .then() step
            fetch(bookmark.API_LINK).then((response) => {
                let json = response.json();
                return json;

                // This returns a promise, so we will process the json
            }).then((json) => {

                // Add the details as a property to the bookmark
                let details = json;
                bookmark.details = details;

                bookmark.duration = bookmark.details.items[0].contentDetails.duration;


                // We will also grab the original title since we do not want to append chains of times if the script has already run
                // This will overwrite any custom title the user has
                bookmark.oldTitle = bookmark.title;
                bookmark.title = bookmark.details.items[0].snippet.title;

                // The duration is returned in ISO 8601 format "PTxxHyyMzzS" - parse this into [00:00:00] format
                function getDurationandTitle() {
                    let time = bookmark.duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

                    time = time.slice(1).map(function (x) {
                        if (x != null) {
                            return x.replace(/\D/, '');
                        }
                    });

                    let hours = (parseInt(time[0]) || 0);
                    let minutes = (parseInt(time[1]) || 0);
                    let seconds = (parseInt(time[2]) || 0);

                    // Create a string property in the [00:00:00] format
                    bookmark.time = `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

                    // Removes the amount of characters inserted into the title to prevent an error on bookmark length
                    // Seems unnecessary at the time due to generous title length accepted by chrome
                    // bookmark.newTitle = `${ bookmark.time } | ${ bookmark.title.substring(0, bookmark.title.length - (bookmark.time.length + 3)) } `;

                    // This is the format of the new title that will be used
                    bookmark.newTitle = `${bookmark.time} | ${bookmark.title}`;
                }

                // Update the bookmark to include the time and title
                function updateBookmarks() {
                    if (bookmark.oldTitle != bookmark.newTitle) {
                        chrome.bookmarks.update(bookmark.id, { title: bookmark.newTitle }, () => { console.log(bookmark.title + " updated") })
                    } else {
                        console.log(bookmark.title + " already has time. Not updated")
                    }
                };

                getDurationandTitle(ytVideoBookmarks);
                updateBookmarks(ytVideoBookmarks);
            }).catch((error) => {
                console.log(`Could not fetch details for ${bookmark.title} - verify this is video has not been removed.`)
            })

        });

    };
};

