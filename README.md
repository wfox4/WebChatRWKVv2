# WebChatRWKVv2

![screenshot](https://github.com/wfox4/WebChatRWKVv2/blob/main/.github/images/screenshot7.png)

[RWKV-V4](https://github.com/BlinkDL/RWKV-LM) inference via
[rwkvstic](https://github.com/harrisonvanderbyl/rwkvstic), with a ChatGPT-like
web UI, including real-time response streaming.

YOU WILL HAVE TO CHANGE THE PATH TO YOUR LIB LOCATION

![screenshot](https://github.com/wfox4/WebChatRWKVv2/blob/main/.github/images/Screenshot3.png)

## How to use

# Be sure you have cuda toolkit 11.7 and python 3.10.9(If you want to use other versions, you can just know you have to make the adjusts needed to the install bat for the right version of the needed modules for any downgrades or upgraded version)

# Download this repository and unzip the files or use
git clone https://github.com/wfox4/WebChatRWKVv2.git

# Download a RWKV model and throw it inside of the models folder. 
Any of the ones from BlinkDL should work, be sure to adjust the settings for your VRAM limitations.
https://huggingface.co/BlinkDL/rwkv-4-raven/tree/main
https://huggingface.co/Hazzzardous/rwkv-fastquant/blob/main/ravenV7-14B-2-1-2.rwkv

# Run the install_and_run.bat file from the file location. MAKE SURE you have the model inside the folder first. This should fail with a Null variable.

# Disable Local Cache or else the conversation log will get doubled lol

![screenshot](https://github.com/wfox4/WebChatRWKVv2/blob/main/.github/images/DisableLocalCacheSoTheLogWorks.png)

# Once installed close the console, grab the RKWVmaster.py from the Custom folder and place it INSIDE of your chatbot_env_new/Lib/site-packages/rwkvsticv folder and paste it inside, yes overwrite the file!

# Then run the RUN.bat and BAM you're done. Open a website and go to http://127.0.0.1:8000/

# Be sure to check the logs and see if you are missing any packages(Note the install_and_run bat should fail because there is a missing variable that is in the custom RWKVmaster.py, So be aware of any errors and understand that you will recieve errors from the install_and_run.bat if you try to use that for the website.) If you are missing any you can modifiy the install_and_run.bat to install them BUT REMEMBER after each install_and_run.bat you have to replace the RWKVmaster to fix the missing variables.
Let me know whats missing as well and I'll update the bat for the next person.



Use the `models` directory and place your `.pth` or `.rwkv` files there.



## TODO

- Clean up the code
- Add a chat mode that has memory
