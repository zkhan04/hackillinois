# lock-in
A Chrome extension that detects when developers go off-track and nudge them to focus.

See more about our project on Devpost: https://devpost.com/software/focus-ldoypu 

## Setup

### Downloading an LLM

* Install [LM Studio](https://lmstudio.ai/).
* Open LM Studio and click the purple search icon on the left to open the model search menu.
* Download the LLM of your choice. During development, we found that `Llama-3.2-3B-Instruct-Q8_0-GGUF` worked very well.

### Setting up a locally hosted LLM server

* Click the green terminal icon on the left to open the developer tab.
* Open the "Select a model to load" menu on the top of the window, and load the model you downloaded earlier.
* Open the Settings menu below the top of the window and enable CORS.
* Next to the Settings menu, turn the server on by clicking the toggle labeled "Status: Stopped"

### Installing the extension

* Clone this repository to your computer.
* In a Google Chrome window, navigate to `chrome://extensions`
* Enable developer mode, click "Load unpacked", and select the folder of the cloned repository.


