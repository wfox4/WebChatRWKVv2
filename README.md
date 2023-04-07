# WebChatRWKVstic

![screenshot](https://github.com/wfox4/WebChatRWKVv2/blob/main/.github/images/Screenshot2.png)

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

# Run the .bat file from the file location. MAKE SURE you have the model inside the folder first. If you don't it will try to download a model.

# Be sure to check the logs and see if you are missing any packages and if you are you can throw them inside the .bat to install.
Let me know whats missing as well and I'll update the bat for the next person.



The script will automatically download a suitable RWKV model into the `models`
folder. If you already have a model, Use the `models` directory and
place your `.pth` or `.rwkv` files there.



## TODO

- Tune the model to better match ChatGPT
- Clean up the code
- Fix the logs and make a chat mode that will change the formatted input into the model.
- Add a new chat button and load the previous conversations into the log.
