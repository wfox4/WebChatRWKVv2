# WebChatRWKVv2(Outdated)
I've started working on something else from the ground up. You can still use this if you want but there are much better options now.

![screenshot](https://github.com/wfox4/WebChatRWKVv2/blob/main/.github/images/screenshot11.png)

[RWKV-V4](https://github.com/BlinkDL/RWKV-LM) inference via
[rwkvstic](https://github.com/harrisonvanderbyl/rwkvstic), with a ChatGPT-like
web UI, including real-time response streaming.

YOU WILL HAVE TO CHANGE THE PATH TO "YOUR" LIB & PYTHON.EXE LOCATION IN BOTH THE INSTALL BAT AND RUN BAT FILES

![screenshot](https://github.com/wfox4/WebChatRWKVv2/blob/main/.github/images/screenshot8.png)

![screenshot](https://github.com/wfox4/WebChatRWKVv2/blob/main/.github/images/screenshot12.png)

https://github.com/BlinkDL/ChatRWKV/blob/main/ChatRWKV-strategy.png

# How to use

## Be sure you have cuda toolkit 11.7 and python 3.10.9. You might also need a C++ Vistual Studio Toolkit. Be sure to check your logs for any errors you might see. ChatGPT4 can help you resolve any issues. (If you want to use other versions, you can just know you have to make the adjusts needed to the install bat for the right version of the needed modules for any downgraded or upgraded versions)

# Download this repository and unzip the files or use
git clone https://github.com/wfox4/WebChatRWKVv2.git

# Download a RWKV model and throw it inside of the models folder. 

Any of the ones from BlinkDL should also work, be sure to adjust the settings for your VRAM limitations.
https://huggingface.co/BlinkDL/rwkv-4-raven/tree/main


# Run the install_and_run.bat file from the file location. MAKE SURE you have the model inside the folder first. This should fail with a Null variable.

# Once installed close the console, grab the RKWVmaster.py from the Custom folder and place it INSIDE of your venv/Lib/site-packages/rwkvsticv folder and paste it inside, yes overwrite the file!

# Then run the RUN.bat and BAM you're done. Open a website and go to http://127.0.0.1:8000/

# Disable Websites Local Cache (F12) or else the conversation log might get doubled lol

![screenshot](https://github.com/wfox4/WebChatRWKVv2/blob/main/.github/images/DisableLocalCacheSoTheLogWorks.png)

# Be sure to check the logs and see if you are missing any packages(Note the install_and_run bat should fail because there is a missing variable that is in the custom RWKVmaster.py, So be aware of any errors and understand that you will recieve errors from the install_and_run.bat if you try to use that for the website.) If you are missing any you can modifiy the install_and_run.bat to install them BUT REMEMBER after each install_and_run.bat you have to replace the RWKVmaster to fix the missing variables.
Let me know whats missing as well and I'll update the bat for the next person.

# If you're finding the answers not suited for your needs, adjusting the context for any formatting issues can make huge differences for the outputs you're looking for. Adjust the Temp and Top P. The context in chat mode will be printed into the log each time you add another input, so you can grab the context and add it to the input to pick back up on conversations. Great for altering the context to be anything you want. You can alter the chat prompt inside the model.py file.

# Turning chatmode off will make it instruction based and won't overwrite the input after each message. Also changes how the text is fed into the model. If you get a none token on inputs. Try adjusting temp/top_p. Fix any formatting issues and try it again.

Use the `models` directory and place your `.pth` or `.rwkv` files there.



If you want to find me, you can over at Twitter: @WoodnBarrelGame
