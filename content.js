baseUrl = 'http://127.0.0.1:1234/';
apis = ['/api/v0/models', '/api/v0/chat/completions']

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

const getLLMPrompt = async (pageContent, topic, custom_instruction) => {
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

const getPageText = () => {
    const body = document.querySelector("body");
    return body.innerText;
}

(async function () {
	console.log("Does this thing even work?")
    const lockinMode = await chrome.storage.sync.get("focusModeEnabled");

    if (lockinMode.focusModeEnabled) {
        // do locked in stuff ig
        console.log("index script called!");

        // get the user's goal
        // const userTopic = await chrome.storage.sync.get("topic");
        const userTopic = "machine learning model optimization";
        const instruction = "Your task is to generate a list of relevant topics based on a given user topic (20+ topics). The goal is to create a broader context so that we can determine whether a webpage is relevant to the user’s interest.Guidelines: - Expand the given topic by identifying closely related subtopics, concepts, or terminologies. - Include synonyms, industry-specific jargon, and alternative ways the topic may be discussed. - If applicable, provide different perspectives (e.g., academic, technical, casual, industry use cases). - Prioritize topics that are likely to appear on webpages that genuinely cover the subject. - Do not generate overly broad or generic topics—keep them directly relevant. - Output should be a list with very brief description that is more like relavent keyword of the description(5 keywords)";

        (async function () {
            const allText = getPageText();

            const response = await getLLMPrompt(allText, userTopic, instruction);
            console.log(response);

        })();
    } else {
		console.log("not locked in");
	}
})();


