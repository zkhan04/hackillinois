const BASE_URL = 'http://127.0.0.1:1234/';
const LLM_MODEL = 'llama-3.2-3b-instruct';
const CUSTOM_INSTRUCTION = "Your task is to determine whether a webpage is relevant to the user's topic of interest. You will be provided with: 1. A structured list of related topics derived from the user's original query. 2. The extracted text content of a webpage. Use this information to assess whether the webpage meaningfully discusses the user's topic. | Output: bool_relevant : boolean, relevant : float(0-1, steps: 0.1) | Guidelines: - Strictly analyze whether the webpage explicitly covers any of the related topics. - Prioritize content that provides substantial information, not just a passing mention. - If the webpage is highly relevant, output bool_relevant = true, relevant = [0.8-1.0]. - If the webpage is partially relevant, output bool_relevant = true, relevant = [0.5-0.8]. - If the webpage is not relevant, output bool_relevant = false, relevant = [0.0-0.5]. - Do not generate explanations, summaries, or additional commentary. Output only the required structured response."

/**
 * Extracts the main content of a webpage, handling static and dynamic sites.
 * Uses Readability.js if available, falls back to semantic HTML elements, common IDs/classes,
 * or the largest text-heavy block. Also extracts search queries when applicable.
 * @returns {string} Extracted text content.
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

    /** 2. Fallback: Try extracting from semantic elements (<main>, <article>) */
    if (!content || content.length < 100) {
        let elem = document.querySelector("main, article");
        if (elem && elem.innerText.trim().length > 100) {
            content = elem.innerText.trim();
            console.log("Extracted from <main> or <article>");
        }
    }

    /** 3. Check common ID/class names */
    if (!content || content.length < 100) {
        let elem = document.querySelector("#content, .content, #main, .main-content, #post, .post-content");
        if (elem && elem.innerText.trim().length > 100) {
            content = elem.innerText.trim();
            console.log("Extracted from common ID/class names");
        }
    }

    /** 4. Find the largest text-heavy block if no structured content is found */
    if (!content || content.length < 100) {
        const getLargestTextBlock = () => {
            let elements = [...document.querySelectorAll("div, section, article")];
            let largest = elements.reduce((prev, curr) =>
                curr.innerText.length > prev.innerText.length ? curr : prev, { innerText: "" }
            );
            return largest.innerText.trim();
        };
        
        content = getLargestTextBlock();
        if (content.length > 100) {
            console.log("Extracted from largest text block");
        }
    }

    /** 5. Fallback: Extract from <body> if everything else fails */
    if (!content || content.length < 100) {
        content = document.body.innerText.trim();
        console.log("Extracted from document body");
    }

    /** 6. Extract search queries if the page is a search engine */
    let searchQuery = "";
    const url = window.location.href;

    if (url.includes("youtube.com")) {
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

(async function () {
    const lockinMode = await chrome.storage.sync.get("focusModeEnabled");
    if (!lockinMode.focusModeEnabled) {
      return;
    } 
  
    // do locked in stuff ig
    console.log("index script called!");

    // get
    const allText = getPageText();
    if (!allText || allText.length == 0) {
        console.log("No content found on the page.");
        return;
    }
    console.log(allText);
    const instruction = `Your task is to determine whether a webpage is relevant to the user's topic of interest. You will be provided with: 1. A structured list of related topics derived from the user's original query. 2. The extracted text content of a webpage. Use this information to assess whether the webpage meaningfully discusses the user's topic. | Output: bool_relevant : boolean, relevant : float(0-1, steps: 0.1) | Guidelines: - Strictly analyze whether the webpage explicitly covers any of the related topics. - Prioritize content that provides substantial information, not just a passing mention. - If the webpage is highly relevant, output bool_relevant = true, relevant = [0.8-1.0]. - If the webpage is partially relevant, output bool_relevant = true, relevant = [0.5-0.8]. - If the webpage is not relevant, output bool_relevant = false, relevant = [0.0-0.5]. - Do not generate explanations, summaries, or additional commentary. Output only the required structured response.`;
    const opinion = await getLLMOpinion(allText, instruction);
    const responseContent = opinion['choices'][0]['message']['content'];
    console.log(responseContent);
    try {
        const llmResult = JSON.parse(responseContent);
        // Record the relevancy score for stats (score is 0 if not relevant)
        const score = llmResult.bool_relevant ? max(1, llmResult.relevant + 0.1) : 0;
        chrome.runtime.sendMessage({ action: "recordScore", score });
        if (!llmResult.bool_relevant) {
            showNotification();
        }
    } catch (error) {
        console.error("Failed to parse LLM response:", error);
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

