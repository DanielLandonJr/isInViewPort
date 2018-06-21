// this is a link to the #mian tag in the thml
let contentBox;

let nextArticleID = 1;

// what adds are currently visibile
let visibleAds = new Set();
let previouslyVisibleAds = null;

let adObserver;
let refreshIntervalID = 0;

// windows load event kick it off
window.addEventListener("load", startup, false);

function startup() {
  contentBox = document.querySelector("main");

  // visibilitychange is used to determine if the actual tab or viewport is visible or if it is covered by something or even another tab
  document.addEventListener("visibilitychange", handleVisibilityChange, false);

  let observerOptions = {
    // watch the viewport
    root: null,
    rootMargin: "0px",
    // array that determines how much of the target element must be visible. this one says check if element is completly obscured or is just becoming unobscrued or passes through 75% visibility
    threshold: [0.0, 0.75]
  };

  // this is the gravy. calls the intersection observer, gives it acallback function (firstitem) and the options from above
  adObserver = new IntersectionObserver(intersectionCallback, observerOptions);

  // create the dynamic content
  buildContents();

  // timer that fires once a second...this is displayed in the target articles ONLY when they meet the visibility threshhold indicated above
  refreshIntervalID = window.setInterval(handleRefreshInterval, 1000);
}

function handleVisibilityChange() {
  // determine if the tab is actually visible and not covered.

  // is the doc hidden
  if (document.hidden) {
    // this code is custom to this example...we can put whatever we want to happen when the tab is hidden
    if (!previouslyVisibleAds) {
      previouslyVisibleAds = visibleAds;
      visibleAds = [];
      previouslyVisibleAds.forEach(function(adBox) {
        updateAdTimer(adBox);
        adBox.dataset.lastViewStarted = 0;
      });
    }
  } else {
    previouslyVisibleAds.forEach(function(adBox) {
      adBox.dataset.lastViewStarted = performance.now();
    });
    visibleAds = previouslyVisibleAds;
    previouslyVisibleAds = null;
  }
}

function intersectionCallback(entries) {
  // magic happens here this is the callback function that is fired when a watched items meets the option threshold

  // entries is a array of tags that have met the threshold value
  entries.forEach(function(entry) {
    let adBox = entry.target;

    if (entry.isIntersecting) {
      // isIntersecting indicates that the item has moved into the viewport
      if (entry.intersectionRatio >= 0.75) {
        // is the item at least 75% visibile
        adBox.dataset.lastViewStarted = entry.time;
        visibleAds.add(adBox);
        console.log(`IN VIEW PORT: ${adBox.innerHTML}`);
      }
    } else {
      visibleAds.delete(adBox);
      // we check here to see if the intersectRatio is 0. if it is then the element has moved out of the viewport
      if ((entry.intersectionRatio === 0.0) && (adBox.dataset.totalViewTime >= 60000)) {
        replaceAd(adBox);
        console.log(`OUT OF VIEWPORT ${adBox.innerHTML}`);
      }
    }
  });
}

function handleRefreshInterval() {
  // this is fired once per ~ sec. this code is custom to the example and not necessary for is viewport visible

  // list of items that need to be updated, this is needed because of issues with the timer if there is system activity or what not
  let redrawList = [];

  visibleAds.forEach(function(adBox) {
    let previousTime = adBox.dataset.totalViewTime;
    updateAdTimer(adBox);

    if (previousTime != adBox.dataset.totalViewTime) {
      redrawList.push(adBox);
    }
  });

  // redraw any items that need attention
  if (redrawList.length) {
    window.requestAnimationFrame(function(time) {
      redrawList.forEach(function(adBox) {
        drawAdTimer(adBox);
      });
    });
  }
}

function updateAdTimer(adBox) {
  // update the timer of suppled tag from adBox

  // also keep track of how much time the add has already been updated so we have a running total instead of the timer starting over each time the add is visible
  let lastStarted = adBox.dataset.lastViewStarted;
  let currentTime = performance.now();

  if (lastStarted) {
    let diff = currentTime - lastStarted;

    adBox.dataset.totalViewTime = parseFloat(adBox.dataset.totalViewTime) + diff;
  }

  adBox.dataset.lastViewStarted = currentTime;
}

function drawAdTimer(adBox) {
  // update the visible time on the add
  let timerBox = adBox.querySelector(".timer");
  let totalSeconds = adBox.dataset.totalViewTime / 1000;
  let sec = Math.floor(totalSeconds % 60);
  let min = Math.floor(totalSeconds / 60);

  timerBox.innerText = min + ":" + sec.toString().padStart(2, "0");
}

let loremIpsum = "<p>Lorem ipsum dolor sit amet, consectetur adipiscing" +
  " elit. Cras at sem diam. Vestibulum venenatis massa in tincidunt" +
  " egestas. Morbi eu lorem vel est sodales auctor hendrerit placerat" +
  " risus. Etiam rutrum faucibus sem, vitae mattis ipsum ullamcorper" +
  " eu. Donec nec imperdiet nibh, nec vehicula libero. Phasellus vel" +
  " malesuada nulla. Aliquam sed magna aliquam, vestibulum nisi at," +
  " cursus nunc.</p>";

function buildContents() {
  // generate random adds for display, these are the static adds that are not tracked
  for (let i=0; i<5; i++) {
    contentBox.appendChild(createArticle(loremIpsum));

    // after each odd numbered add created call function to generate tracked add
    if (!(i % 2)) {
      loadRandomAd();
    }
  }
}

function createArticle(contents) {
  // create the fluff articles
  let articleElem = document.createElement("article");
  articleElem.id = nextArticleID;

  let titleElem = document.createElement("h2");
  titleElem.id = nextArticleID;
  titleElem.innerText = "Article " + nextArticleID + " title";
  articleElem.appendChild(titleElem);

  articleElem.innerHTML += contents;
  nextArticleID +=1 ;

  return articleElem;
}

function loadRandomAd(replaceBox) {
  // create tracked add

  // if no value suppled for replaceBox then it is assumed that it is a new item so create the tag/etc. if something is supplied then it is an existing tag so just update
  let ads = [
    {
      bgcolor: "#cec",
      title: "Eat Green Beans",
      body: "Make your mother proud—they're good for you!"
    },
    {
      bgcolor: "aquamarine",
      title: "MillionsOfFreeBooks.whatever",
      body: "Read classic literature online free!"
    },
    {
      bgcolor: "lightgrey",
      title: "3.14 Shades of Gray: A novel",
      body: "Love really does make the world go round..."
    },
    {
      bgcolor: "#fee",
      title: "Flexbox Florist",
      body: "When life's layout gets complicated, send flowers."
    }
  ];
  let adBox, title, body, timerElem;

  // random selection of which add to create
  let ad = ads[Math.floor(Math.random()*ads.length)];

  if (replaceBox) {
    // tag exists so update

    // stop watching this element
    adObserver.unobserve(replaceBox);
    adBox = replaceBox;
    title = replaceBox.querySelector(".title");
    body = replaceBox.querySelector(".body");
    timerElem = replaceBox.querySelector(".timer");
  } else {
    // tag does not exist so create it
    adBox = document.createElement("div");
    adBox.className = "ad";
    title = document.createElement("h2");
    body = document.createElement("p");
    timerElem = document.createElement("div");
    adBox.appendChild(title);
    adBox.appendChild(body);
    adBox.appendChild(timerElem);
  }

  adBox.style.backgroundColor = ad.bgcolor;

  title.className = "title";
  body.className = "body";
  title.innerText = ad.title;
  body.innerHTML = ad.body;

  adBox.dataset.totalViewTime = 0;
  adBox.dataset.lastViewStarted = 0;

  timerElem.className="timer";
  timerElem.innerText = "0:00";

  // if this is a new add we need to update the dom
  if (!replaceBox) {
    contentBox.appendChild(adBox);
  }

  // the magic, add item so it can be tracked

  // at this point if the ad becomes 100% obscured or even a single pixel becomes visible, or the add passes through 75% visibility (either coming or going) we watch it
  adObserver.observe(adBox);
}

function replaceAd(adBox) {
  // if an ad has been visibile long enough for its timer to go over 60 seconds then generate new content for the ad
  let visibleTime;

  updateAdTimer(adBox);

  visibleTime = adBox.dataset.totalViewTime
  console.log("  Replacing ad: " + adBox.querySelector("h2").innerText + " - visible for " + visibleTime)

  loadRandomAd(adBox);
}