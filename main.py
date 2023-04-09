print(
    r"""
 __          __  _      _____ _           _      
 \ \        / / | |    / ____| |         | |     
  \ \  /\  / /__| |__ | |    | |__   __ _| |_    
   \ \/  \/ / _ \ '_ \| |    | '_ \ / _` | __|   
    \  /\  /  __/ |_) | |____| | | | (_| | |_    
  ___\/__\/ \___|_.__/ \_____|_| |_|\__,_|\__|   
 |  __ \ \        / / |/ /\ \    / / | | (_)     
 | |__) \ \  /\  / /| ' /  \ \  / /__| |_ _  ___ 
 |  _  / \ \/  \/ / |  <    \ \/ / __| __| |/ __|
 | | \ \  \  /\  /  | . \    \  /\__ \ |_| | (__ 
 |_|  \_\  \/  \/   |_|\_\    \/ |___/\__|_|\___|
                                                 
"""
)

print("Importing modules...")

import asyncio
import currentcontext
from fastapi import FastAPI, WebSocket, BackgroundTasks
from fastapi.staticfiles import StaticFiles
import json
import os
import model
from model import set_temp, set_top_p_usual, stop_model

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")


def save_log(filename, content):
    with open(os.path.join('logs', filename), 'a') as file:
        file.write(content)

if not os.path.exists('logs'):
    os.makedirs('logs')

@app.post("/api/stop_model")
async def stop_model_route(background_tasks: BackgroundTasks):
    background_tasks.add_task(model.stop_model)
    print("Stop model endpoint called")
    return {"status": "Model stopping"}



@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    session = {"state": None}
    loop = asyncio.get_running_loop()



    async def reply(id, *, result=None, error=None):
        either = (result is None) is not (error is None)
        assert either, "Either result or error must be set!"

        if result is not None:
            await websocket.send_json({"jsonrpc": "2.0", "result": result, "id": id})        
        elif error is not None:
            await websocket.send_json({"jsonrpc": "2.0", "error": error, "id": id})

    def on_progress(id, loop):
        def callback(res):
            asyncio.run_coroutine_threadsafe(reply(id, result={"token": res}), loop)

        return callback

    def on_done(input):
        def callback(result):
            print("--- input ---")
            print(input)
            print("--- output ---")
            print(result["output"])
            print("---")

            session["state"] = result["state"]


        return callback

    while True:
        data = await websocket.receive_text()
        print("Received data:", data)

        message = json.loads(data)  # Define and parse the message variable

        if "temp" in message:
            set_temp(message["temp"])

        if "top_p_usual" in message:
            set_top_p_usual(message["top_p_usual"])



        method, params, id = (
            message.get("method", None),
            message.get("params", None),
            message.get("id", None),
        )

        if message.get("action") == "update_context":
            new_context = message.get("context", None)
            if new_context is not None:
                currentcontext.userscontext = new_context.strip()
            continue

        if method == "chat":
            text = params.get("text", None)
            if text is None:
                await reply(id, error="text is required")

            save_log('conversation_log.txt', f'User: {text}\n')

            result = {}

            await loop.run_in_executor(
                None,
                model.chat,
                session["state"],
                text,
                on_progress(id, loop),
                lambda res: on_done(text)(res),
            )
    
    # Check if the result dictionary contains the expected key
            if "output" in result:
                output = result["output"]
            else:
                # Use a default value if the key is not present
                output = "Sorry, I didn't understand that."

    # Save the model's response
            save_log('conversation_log.txt', f'Model: {output}\n')
    
        else:
            await reply(id, error=f"invalid method '{method}'")


app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app)

