baseUrl = 'http://127.0.0.1:1234/';
apis = ['/api/v0/models', '/api/v0/chat/completions']
// import { getPageText } from "./scraper";

// gets all of the "mai"
const getPageText = () => {
    const content = document.querySelector("#content");
    // console.log(content.innerText);
    return content.innerText;
}

const getLLMModels = async () => {
	try {
		const response = await fetch(`${baseUrl}api/v0/models`);
		if (!response.ok) throw new Error('Failed to fetch models');
		return await response.json();
	} catch (err) {
		console.error(err);
		return [];
	}
};

const generateTopicList = async (topic, custom_instruction) => {
	// Construct the prompt using pageContent and topic.
	const user_prompt = `topic: ${topic}`;
	try {
		const response = await fetch(`${baseUrl}api/v0/chat/completions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [
                    { "role": "system", "content": "Do not add any human-like explanations, just provide the structured data output."},
                    { "role": "system", "content": custom_instruction},
                    { "role": "user", "content": user_prompt}
                ],
                model: 'llama-3.2-3b-instruct',
				max_tokens: -1
			})
		});
		if (!response.ok) throw new Error('Failed to get completions');
		return await response.json();
	} catch (err) {
		console.error(err);
		return null;
	}
};

const getLLMOpinion = async (page_content, custom_instruction) => {
	// Construct the prompt using pageContent and topic.
    const ref_context = await getStoredTopicList();
    const body = JSON.stringify({
        messages: [
            // { "role": "system", "content": "Do not add any human-like explanations, just provide the structured data output."},
            { "role": "system", "content": custom_instruction},
            // { "role": "user", "content": `Goal: ${}`}
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
              "required": ["bool_relevant"]
              }
            }
        },
        model: 'llama-3.2-3b-instruct',
        max_tokens: -1
    })
    // console.log(body);
	try {
		const response = await fetch(`${baseUrl}api/v0/chat/completions`, {
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

const storeTopicList = async (response) => {
	try {
		await chrome.storage.local.set({ llmResponse: response });
		console.log('LLM response stored successfully');
	} catch (err) {
		console.error('Failed to store LLM response', err);
	}
};

const getStoredTopicList = async () => {
    try {
        const result = await chrome.storage.local.get('llmResponse');
        if (result.llmResponse) {
            console.log('Retrieved LLM response:', result.llmResponse);
            return result.llmResponse;
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
	console.log("Does this thing even work?")
    const lockinMode = await chrome.storage.sync.get("focusModeEnabled");

    if (lockinMode.focusModeEnabled) {
        // do locked in stuff ig
        console.log("index script called!");

        // get the user's goal
        // const userTopic = await chrome.storage.sync.get("topic");
        const userTopic = "machine learning model optimization";
        var instruction = "";

        (async function () {
            // get
            const allText = getPageText();

            instruction = "Your task is to generate a list of relevant topics based on a given user topic (20+ topics). The goal is to create a broader context so that we can determine whether a webpage is relevant to the user’s interest.Guidelines: - Expand the given topic by identifying closely related subtopics, concepts, or terminologies. - Include synonyms, industry-specific jargon, and alternative ways the topic may be discussed. - If applicable, provide different perspectives (e.g., academic, technical, casual, industry use cases). - Prioritize topics that are likely to appear on webpages that genuinely cover the subject. - Do not generate overly broad or generic topics—keep them directly relevant. - Output should be a list with very brief description that is more like relavent keyword of the description(5 keywords)";
            const response = await generateTopicList(userTopic, instruction);
            const llmContent = response['choices'][0]['message']['content'];

            // Store the LLM response
            await storeTopicList(llmContent);

            instruction = `Your task is to determine whether a webpage is relevant to the user’s topic of interest. You will be provided with: 1. A structured list of related topics derived from the user’s original query. 2. The extracted text content of a webpage. Use this information to assess whether the webpage meaningfully discusses the user’s topic. | Output: bool_relevant : boolean, relevant : float(0-1, steps: 0.1) | Guidelines: - Strictly analyze whether the webpage explicitly covers any of the related topics. - Prioritize content that provides substantial information, not just a passing mention. - If the webpage is highly relevant, output bool_relevant = true, relevant = [0.8-1.0]. - If the webpage is partially relevant, output bool_relevant = true, relevant = [0.5-0.8]. - If the webpage is not relevant, output bool_relevant = false, relevant = [0.0-0.5]. - Do not generate explanations, summaries, or additional commentary. Output only the required structured response.`
            const opinion = await getLLMOpinion(allText, instruction);
            console.log(opinion['choices'][0]['message']['content']);

        })();
    } else {
		console.log("not locked in");
	}
})();


