# WebChatRWKVv2

![screenshot](https://github.com/wfox4/WebChatRWKVv2/blob/main/.github/images/screenshot5.png)

[RWKV-V4](https://github.com/BlinkDL/RWKV-LM) inference via
[rwkvstic](https://github.com/harrisonvanderbyl/rwkvstic), with a ChatGPT-like
web UI, including real-time response streaming.

YOU WILL HAVE TO CHANGE THE PATH TO YOUR LIB LOCATION

![screenshot](https://github.com/wfox4/WebChatRWKVv2/blob/main/.github/images/Screenshot3.png)

## How to use


# Download/Clone this repository
git clone https://github.com/wfox4/WebChatRWKVv2.git

# Download this model and throw it inside of the models folder. 
https://huggingface.co/Hazzzardous/rwkv-fastquant/blob/main/ravenV7-14B-2-1-2.rwkv

# Run the install_and_run.bat file from the file location. MAKE SURE you have the model inside the folder first.

# Once installed close the console, grab the RKWVmaster from the Custom folder and place it INSIDE of your chatbot_env_new/Lib/site-packages/rwkvsticv folder and overwrite it!

# Then run the RUN.bat and you should be able to stop the model mid generation if it starts getting crazy.

# Be sure to check the logs and see if you are missing any packages and if you are you can throw them inside the install_and_run.bat to install.
Let me know whats missing as well and I'll update the bat for the next person.



Use the `models` directory and place your `.pth` or `.rwkv` files there.



## TODO

- Clean up the code
- Fix the logs and make a chat mode that will change the formatted input into the model.
- Add a new stop button and load the previous conversations into the log. You can't click on them yet but you can check them from your local storage. Sorry I'm trying.
