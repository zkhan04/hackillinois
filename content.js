baseUrl = 'http://127.0.0.1:1234/';
apis = ['/api/v0/models', '/api/v0/chat/completions']
// import { getPageText } from "./scraper";
LLM_MODEL = 'llama-3.2-3b-instruct';
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
                response_format: {
                    "type": "json_schema",
                    "json_schema": {
                      "name": "relavency",
                      "strict": "true",
                      "schema": {
                        "type": "object",
                        "properties": {
                            "topic": {
                                "type": "string"
                            },
                            "description": {
                                "type": "string"
                            },
                            "list_of_topics": {
                                "type": "array"
                            }
                        },
                      "required": ["topic", "description", "list_of_topics"]
                      }
                    }
                },
                model: LLM_MODEL,
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
	console.log("Does this thing even work?")
    const lockinMode = await chrome.storage.sync.get("focusModeEnabled");

    if (lockinMode.focusModeEnabled) {
        // do locked in stuff ig
        console.log("index script called!");

        // get the user's goal
        // const userTopic = await chrome.storage.sync.get("topic");
        const userTopic = "machine learning model optimization";
        storeTopic(userTopic);

        var instruction = "";

        (async function () {
            // get
            const allText = getPageText();

            instruction = "Your task is to generate a structured list of 20+ relevant topics based on a given user topic. The goal is to create a broader context to help determine whether a webpage is relevant to the user’s interest. | Output Format: topic: string (Original user topic), description: string (Brief summary of the topic), list_of_topics: array (20+ relevant subtopics, each containing a short keyword-based description with exactly 5 keywords). | Guidelines: - Expand the given topic by identifying closely related subtopics, concepts, or terminologies. - Include synonyms, industry-specific jargon, and alternative ways the topic may be discussed. - If applicable, provide different perspectives (e.g., academic, technical, casual, industry use cases). - Prioritize topics that are likely to appear on webpages that genuinely cover the subject. - Do not generate overly broad or generic topics—keep them directly relevant. - Ensure that each subtopic in list_of_topics has an accompanying 5-keyword description that concisely represents its core concept. - Do not generate explanations, summaries, or commentary beyond the specified format.";
            const response = await generateTopicList(userTopic, instruction);
            const llmContent = response['choices'][0]['message']['content'];
            console.log(llmContent);

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


