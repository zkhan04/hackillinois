const BASE_URL = 'http://127.0.0.1:1234/';
const LLM_MODEL = 'llama-3.2-3b-instruct';
const CUSTOM_INSTRUCTION = "Your task is to determine whether a webpage is relevant to the user's topic of interest. You will be provided with: 1. A structured list of related topics derived from the user's original query. 2. The extracted text content of a webpage. Use this information to assess whether the webpage meaningfully discusses the user's topic. | Output: bool_relevant : boolean, relevant : float(0-1, steps: 0.1) | Guidelines: - Strictly analyze whether the webpage explicitly covers any of the related topics. - Prioritize content that provides substantial information, not just a passing mention. - If the webpage is highly relevant, output bool_relevant = true, relevant = [0.8-1.0]. - If the webpage is partially relevant, output bool_relevant = true, relevant = [0.5-0.8]. - If the webpage is not relevant, output bool_relevant = false, relevant = [0.0-0.5]. - Do not generate explanations, summaries, or additional commentary. Output only the required structured response."


/**
 * Get the text content of the page, truncating to 20000 characters if necessary
 * @returns {string} The page content
 */
const getPageText = () => {

    let content = "";

    // Attempt to use Mozilla's Readability if available
    try {
        if (typeof Readability !== "undefined") {
            const docClone = document.cloneNode(true); // Clone document to avoid modifications
            const reader = new Readability(docClone);
            const article = reader.parse();
            if (article && article.textContent && article.textContent.length > 100) {
                content = article.textContent;
                console.log(`Using Readability extraction. Content size: ${content.length}`);
            }
        }
    } catch (e) {
        console.error("Error using Readability:", e);
    }

    // Fallback: Try common selectors if Readability fails or content is too short
    if (!content || content.length < 100) {
        const selectors = ["#content", "article", "main", "body"];
        for (let selector of selectors) {
            const elem = document.querySelector(selector);
            if (elem && elem.innerText && elem.innerText.length > 100) {
                content = elem.innerText;
                console.log(`Using selector "${selector}". Content size: ${content.length}`);
                break;
            }
        }
    }

    // Extract search queries from common search platforms
    let searchQuery = "";
    const url = window.location.href;
    
    if (url.includes("youtube.com")) {
        // YouTube search bar
        const ytSearch = document.querySelector('input#search');
        if (ytSearch && ytSearch.value) {
            searchQuery = `Search Query: ${ytSearch.value}`;
            console.log(`Extracted YouTube search query: ${ytSearch.value}`);
        }
    } else if (url.includes("google.com/search")) {
        // Google search bar
        const googleSearch = document.querySelector('input[name="q"]');
        if (googleSearch && googleSearch.value) {
            searchQuery = `Search Query: ${googleSearch.value}`;
            console.log(`Extracted Google search query: ${googleSearch.value}`);
        }
    } else if (url.includes("bing.com/search")) {
        // Bing search bar
        const bingSearch = document.querySelector('input[name="q"]');
        if (bingSearch && bingSearch.value) {
            searchQuery = `Search Query: ${bingSearch.value}`;
            console.log(`Extracted Bing search query: ${bingSearch.value}`);
        }
    } else if (url.includes("duckduckgo.com/")) {
        // DuckDuckGo search bar
        const ddgSearch = document.querySelector('input[name="q"]');
        if (ddgSearch && ddgSearch.value) {
            searchQuery = `Search Query: ${ddgSearch.value}`;
            console.log(`Extracted DuckDuckGo search query: ${ddgSearch.value}`);
        }
    }

    // Prepend search query to extracted content if available
    if (searchQuery) {
        content = `${searchQuery}\n\n${content}`;
    }

    // Truncate content if it exceeds the maximum allowed length
    if (content.length > 20000) {
        console.log("Content too long, truncating to 20000 characters");
        content = content.slice(0, 20000);
    }

    return content;
};

/**
 * Asks the LLM whether the current webpage is relevant to the current topic
 * @param {string} page_content The content of the current webpage
 * @param {string} custom_instruction The instruction to give to the LLM
 * @returns {Promise<{bool_relevant: boolean, relevant: number}>} A promise resolving to an object containing the LLM's opinion on whether the webpage is relevant, given as a boolean and a number between 0 and 1
 */
const getLLMOpinion = async (page_content) => {
    const {topic, ref_context} = await getStoredData();

	// Construct the prompt using pageContent and topic.
    console.log("Topic Query: " + topic);
    const body = JSON.stringify({
        messages: [
            { "role": "system", "content": CUSTOM_INSTRUCTION},
            { "role": "user", "content": `Related Topics: ${ref_context}`},
            { "role": "user", "content": `Current Web Content: ${page_content}`},
        ],
        response_format: {
            "type": "json_schema",
            "json_schema": {
              "name": "relavency",
              "strict": "true",
              "schema": {
                "type": "object",
                "properties": {
                  "bool_relevant": {
                    "type": "boolean"
                  },
                  "relevant": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1,
                  }
                },
              "required": ["bool_relevant", "relevant"]
              }
            }
        },
        model: LLM_MODEL,
        max_tokens: -1,
        temperature: 0.2
    })
    
    // attempt to call a locally hosted LLM.
	try {
		const response = await fetch(`${BASE_URL}api/v0/chat/completions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: body
		});
		if (!response.ok) throw new Error('Failed to get completions');
		return await response.json();
	} catch (err) {
		console.error(err);
		return null;
	}
};

const getStoredData = async () => {
    try {
        const result = await chrome.storage.local.get(["topic", "topicList"]);
        return {
            topic: result.topic || null,
            topicList: result.topicList || null
        };
    } catch (err) {
        console.error("Failed to retrieve stored data", err);
        return { topic: null, topicList: null };
    }
};

async function showNotification() {
    // Get focus level from storage
    const result = await chrome.storage.sync.get(["focusLevel"]);
    const focusLevel = result.focusLevel || 'easy';
    
    if (focusLevel === 'hard') {
        // Hard mode: Use popup window notification (more intrusive)
        chrome.runtime.sendMessage({ action: "showNotification" });
    } else {
        // Easy mode: Use in-page notification
        showInPageNotification();
    }
}

function showInPageNotification() {
    console.log("Showing in-page notification");
    
    // Create the notification element
    const notification = document.createElement('div');
    notification.id = 'focus-mode-notification';
    notification.innerHTML = `
        <div class="focus-notification-content">
            <div class="focus-notification-icon">⚠️</div>
            <div class="focus-notification-text">
                <h3>Attention!</h3>
                <p>This page seems off-topic. Stay focused!</p>
            </div>
            <button class="focus-notification-close">✕</button>
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        #focus-mode-notification {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(to right, #ff8a65, #ff7043);
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            z-index: 99999;
            width: 300px;
            padding: 0;
            animation: slide-up 0.4s ease-out forwards;
            overflow: hidden;
        }
        
        .focus-notification-content {
            display: flex;
            align-items: center;
            padding: 12px 15px;
        }
        
        .focus-notification-icon {
            font-size: 24px;
            margin-right: 12px;
        }
        
        .focus-notification-text {
            flex-grow: 1;
            text-align: left;
        }
        
        .focus-notification-text h3 {
            margin: 0;
            font-size: 16px;
            font-weight: bold;
        }
        
        .focus-notification-text p {
            margin: 5px 0 0;
            font-size: 14px;
        }
        
        .focus-notification-close {
            background: transparent;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            margin-left: 10px;
            opacity: 0.8;
        }
        
        .focus-notification-close:hover {
            opacity: 1;
        }
        
        @keyframes slide-up {
            from {
                opacity: 0;
                transform: translate(-50%, 20px);
            }
            to {
                opacity: 1;
                transform: translate(-50%, 0);
            }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Add close button functionality
    const closeButton = notification.querySelector('.focus-notification-close');
    closeButton.addEventListener('click', () => {
        notification.style.animation = 'slide-down 0.3s forwards';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    });
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.animation = 'slide-down 0.3s forwards';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, 10000);
}

// Add the slide-down animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
@keyframes slide-down {
    from {
        opacity: 1;
        transform: translate(-50%, 0);
    }
    to {
        opacity: 0;
        transform: translate(-50%, 20px);
    }
}
`;
document.head.appendChild(styleSheet);

(async function () {
    // Get focus mode status correctly
    try {
        const result = await chrome.storage.sync.get(["focusModeEnabled"]);
        if (!result || !result.focusModeEnabled) {
            console.log("Focus mode not enabled, exiting content script");
            return;
        }
        
        console.log("Focus mode is enabled, running content script");

        // get content
        const allText = getPageText();
        if (!allText || allText.length == 0) {
            console.log("No content found on the page.");
            return;
        }
        
        const opinion = await getLLMOpinion(allText);
        if (!opinion || !opinion.choices || !opinion.choices[0] || !opinion.choices[0].message) {
            console.error("Invalid response from LLM", opinion);
            return;
        }
        
        const responseContent = opinion.choices[0].message.content;
        console.log("LLM response:", responseContent);
        
        try {
            const llmResult = JSON.parse(responseContent);
            // Record the relevancy score for stats (score is 0 if not relevant)
            const score = llmResult.bool_relevant ? Math.max(0.1, llmResult.relevant) : 0;
            console.log(`Relevancy score: ${score}, bool_relevant: ${llmResult.bool_relevant}`);
            
            chrome.runtime.sendMessage({ action: "recordScore", score });
            
            if (!llmResult.bool_relevant) {
                console.log("Page not relevant, showing notification");
                showNotification();
            }
        } catch (error) {
            console.error("Failed to parse LLM response:", error);
        }
    } catch (error) {
        console.error("Error in content script:", error);
    }
})();

// HOW TO HANDLE ENDING A SESSION?
// 1. When does a session end?

/*
A session will end when a) the timer expires or b) the user manually ends a focus session.

When the session ends:

TODO
// we want to set focusModeEnabled to False.
// we want to remove any list of topics in storage.
// timer should be reset to 0

Other concerns:

* Do we want the extension to notify the user as soon as they go off-track, or set a small timeout (1-3 min?)
* What happens to these timeouts when the user switches tabs?
* If the user spends more than a certain amount of time (10-15 min) off-track, do we disable focus mode?
* Can we overwhelm the LLM by continuously opening tabs?  

*/

