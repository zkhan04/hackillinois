const BASE_URL = 'http://127.0.0.1:1234/';
const LLM_MODEL = 'llama-3.2-3b-instruct';

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

const getLLMModels = async () => {
	try {
		const response = await fetch(`${BASE_URL}api/v0/models`);
		if (!response.ok) throw new Error('Failed to fetch models');
		return await response.json();
	} catch (err) {
		console.error(err);
		return [];
	}
};

const getLLMOpinion = async (page_content, custom_instruction) => {
	// Construct the prompt using pageContent and topic.
    console.log("Topic Query: " + await getStoredTopic());
    const ref_context = await getStoredTopicList();
    const body = JSON.stringify({
        messages: [
            { "role": "system", "content": custom_instruction},
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
    // console.log(body);
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

const storeTopic = async (response) => {
	try {
		await chrome.storage.local.set({ topic: response });
	} catch (err) {
		console.error('Failed to store LLM response', err);
	}
};

const getStoredTopic = async () => {
    try {
        const result = await chrome.storage.local.get('topic');
        if (result.topic) {
            return result.topic;
        } else {
            console.log('No LLM response found in storage');
            return null;
        }
    } catch (err) {
        console.error('Failed to retrieve LLM response', err);
        return null;
    }
};

const storeTopicList = async (response) => {
	try {
		await chrome.storage.local.set({ topicList: response });
	} catch (err) {
		console.error('Failed to store LLM response', err);
	}
};

const getStoredTopicList = async () => {
    try {
        const result = await chrome.storage.local.get('topicList');
        if (result.topicList) {
            return result.topicList;
        } else {
            console.log('No LLM response found in storage');
            return null;
        }
    } catch (err) {
        console.error('Failed to retrieve LLM response', err);
        return null;
    }
};

(async function () {
    const lockinMode = await chrome.storage.sync.get("focusModeEnabled");

    if (lockinMode.focusModeEnabled) {
        // do locked in stuff ig
        console.log("index script called!");

        (async function () {
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
                if (!llmResult.bool_relevant) {
                    showNotification();
                }
            } catch (error) {
                console.error("Failed to parse LLM response:", error);
            }

        })();
    } else {
		console.log("not locked in");
	}
})();