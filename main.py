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
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
import json

import model
from model import stop_model

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")


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
        # process data as required for your application

        # Add this block to handle stop model request
        message = json.loads(data)
        if message.get("action") == "stop_model":
            stop_model()
            await websocket.send_text("Model stopped")
        # End of added block

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


            

            await loop.run_in_executor(
                None,
                model.chat,
                session["state"],
                text,
                on_progress(id, loop),
                on_done(text),
            )
        else:
            await reply(id, error=f"invalid method '{method}'")



app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app)
