const BASE_URL = 'http://127.0.0.1:1234/';
const LLM_MODEL = 'llama-3.2-3b-instruct';
const CUSTOM_INSTRUCTION = "Your task is to determine whether a webpage is relevant to the user's topic of interest. You will be provided with: 1. A structured list of related topics derived from the user's original query. 2. The extracted text content of a webpage. Use this information to assess whether the webpage meaningfully discusses the user's topic. | Output: bool_relevant : boolean, relevant : float(0-1, steps: 0.1) | Guidelines: - Strictly analyze whether the webpage explicitly covers any of the related topics. - Prioritize content that provides substantial information, not just a passing mention. - If the webpage is highly relevant, output bool_relevant = true, relevant = [0.8-1.0]. - If the webpage is partially relevant, output bool_relevant = true, relevant = [0.5-0.8]. - If the webpage is not relevant, output bool_relevant = false, relevant = [0.0-0.5]. - Do not generate explanations, summaries, or additional commentary. Output only the required structured response."

/**
 * Get the text content of the page, truncating to 20000 characters if necessary
 * @returns {string} The page content
 */
const getPageText = () => {
    const content = document.querySelector("#content");

    console.log(`Content size: ${content.innerText.length}`);

    if (content.innerText.length > 20000) {
        console.log("Content too long, truncating to 20000 characters");
        return content.innerText.slice(0, 20000);
    }

    return content.innerText;
}

/**
 * Asks the LLM whether the current webpage is relevant to the current topic
 * @param {string} page_content The content of the current webpage
 * @param {string} custom_instruction The instruction to give to the LLM
 * @returns {Promise<{bool_relevant: boolean, relevant: number}>} A promise resolving to an object containing the LLM's opinion on whether the webpage is relevant, given as a boolean and a number between 0 and 1
 */
const getLLMOpinion = async (page_content) => {
	// Construct the prompt using pageContent and topic.
    console.log("Topic Query: " + await getStoredTopic());
    const ref_context = await getStoredTopicList();
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

/**
 * Retrieves the currently stored topic from chrome.storage.local
 * @returns {Promise<string>} The current topic, or null if none is stored
 */
const getStoredTopic = async () => {
    try {
        const result = await chrome.storage.local.get('topic');
        if (result.topic) {
            return result.topic;
        } else {
            console.log('No topic found in storage');
            return null;
        }
    } catch (err) {
        console.error('Failed to retrieve LLM response', err);
        return null;
    }
};

/**
 * Retrieves the currently stored LLM topic list from chrome.storage.local
 * @returns {Promise<object>} The current LLM topic list, or null if none is stored
 */
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
            const opinion = await getLLMOpinion(allText);
            console.log(opinion['choices'][0]['message']['content']);

        })();
    } else {
		console.log("not locked in");
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
* Can we overwhelm the LLM by continuously opening tabs? Maybe, we 

*/