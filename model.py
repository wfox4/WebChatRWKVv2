import os
os.environ["RWKV_JIT_ON"] = '1'
os.environ["RWKV_CUDA_ON"] = '1'
import queue
import threading
from threading import Event
import traceback
from dataclasses import dataclass, field
from typing import Any, Callable
import currentcontext
import torch
from rwkvstic.agnostic.backends import TORCH
from rwkvstic.load import RWKV
from rwkvstic.rwkvMaster import RWKVMaster




temp = 0.7
top_p_usual = 0.5

def set_temp(new_temp):
    global temp
    temp = new_temp

def set_top_p_usual(new_top_p_usual):
    global top_p_usual
    top_p_usual = new_top_p_usual


def no_tqdm():
    from functools import partialmethod

    from tqdm import tqdm

    tqdm.__init__ = partialmethod(tqdm.__init__, disable=True)









def clear_stop_event():
    RWKVMaster.stop_event = False


def stop_model():
    RWKVMaster.stop_event = True
    print("Oh Wow")


def get_checkpoint():
    import psutil
    import os
    from glob import glob
    from os import path

    has_cuda = torch.cuda.is_available()
    ram_total = psutil.virtual_memory().total
    vram_total = 0

    # Check if CUDA is available
    if has_cuda:
        print("CUDA available")
        vram_total = torch.cuda.mem_get_info()[1]
    else:
        print(
            """
**************************************
WARN: CUDA not available, will use CPU
If you want to use CUDA, try running this command:

  pip install torch --extra-index-url https://download.pytorch.org/whl/cu117 --upgrade

For more information, see: https://pytorch.org/get-started/locally/
*************************************
"""
        )

    models_dir = "models"
    if not path.exists(models_dir):
        os.makedirs(models_dir)

    # Check if there are any models in the models/ folder
    models = glob(path.join(models_dir, "*.pth")) + glob(path.join(models_dir, "*.rwkv"))

    if len(models) == 0:
        raise Exception("No local models found in the 'models' folder. Please place a model file in the folder and try again.")

    # Find a valid model file
    valid_model = None
    for model_file in models:
        if os.path.exists(model_file):
            valid_model = model_file
            break

    if valid_model is None:
        raise Exception("No valid model found in the 'models' folder.")

    # TODO: get model name from command line args / config file
    print("-> Using model", valid_model)
    return valid_model





# Load the model (supports full path, relative path, and remote paths)
model = RWKV(
    get_checkpoint(),
    mode=TORCH,
    useGPU=torch.cuda.is_available(),
    runtimedtype=torch.float32,
    dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
)



# Disable tqdm
no_tqdm()


@dataclass
class Task:
    state: Any = model.emptyState
    context: str = ""
    progress_callback: Callable[[str], None] = lambda x: None
    done_callback: Callable[[dict[str, Any]], None] = lambda x: None
    forward_kwargs: dict = field(default_factory=dict)


inferqueue: queue.Queue[Task] = queue.Queue()


def inferthread():
    while True:
        try:
            # Get task
            task = inferqueue.get()
            model.resetState()
            # Perform inference
            model.setState(task.state)
            model.loadContext(newctx=task.context)
            print(f"Model type: {type(model)}")
            res = model.forward(
                number=4096,
                temp=temp,
                top_p_usual=top_p_usual,
                end_adj=-2,
                progressLambda=task.progress_callback,
                **task.forward_kwargs,
                )

            task.done_callback(res)
            
        except Exception:
            traceback.print_exc()
        finally:
            task.progress_callback(None)


def infer(*, context: str, state=None, on_progress=None, on_done=None, forward_kwargs={}):
    ev = threading.Event()

    # args['logits', 'state', 'output', 'progress', 'tokens', 'total', 'current']
    def _progress_callback(args):
        if on_progress is None:
            return

        if args is None:
            on_progress(None, None)
            return

        last_token = args["tokens"][-1]
        token_str = model.tokenizer.decode(last_token)
        
        on_progress(token_str, args["state"])

    def _done_callback(result):
        ev.set()
        if on_done is None:
            return
        on_done(result)

    task = Task(
        state=state if state is not None else model.emptyState,
        context=context,
        progress_callback=_progress_callback,
        done_callback=_done_callback,
        forward_kwargs=forward_kwargs,
    )
    inferqueue.put(task)
    ev.wait()


print("Loading context")
chat_initial_context = open("prompt.txt", encoding="utf-8").read().strip()
model.loadContext(
    newctx=chat_initial_context,
    progressCallBack=lambda p: print(model.tokenizer.decode(p[-1]), end=""),
)
chat_initial_state = model.getState()
model.resetState()
print("Chat context loaded")

t = threading.Thread(target=inferthread, daemon=True)
t.start()

def get_initial_state():
    return model.getState()

def chat(state, input: str, on_progress, on_done):
    model.resetState()
    # Format the input to include context and user input
    input = f"""
### Instruction: {input}

### Input: {currentcontext.userscontext}

### Output: """

    print("Formatted input:", input)
    # Set empty state if not provided
    state = get_initial_state()

    ctx = {"buf": "", "buf_state": None}
    stop_sequences = ["\nQuestion:", "\n---"]

    def _on_progress(token: str, state=None):
        print("token", repr(token))
        if token is None:
            on_progress(None)
            return

        # This chunk of code will look for stop sequences. If found, all text
        # will be stored in the `buf` until either the whole stop sequence is
        # matched, in which case all subsequent progress is dropped, or the
        # sequence doesn't match fully, in which case the buffer will be flushed
        # to the callback.
        #
        # The model state is also stored in the `buf_state`, only when the stop
        # sequences do not match. This allows us to restore the model to right
        # before the stop sequence was produced.
        for ss in stop_sequences:
            if ss == ctx["buf"]:
                return

            if ss.startswith(ctx["buf"] + token):
                ctx["buf"] += token
                if ss == ctx["buf"]:
                    on_progress(None)
                return

        for ss in stop_sequences:
            if ss.startswith(token):
                if len(ctx["buf"]) > 0:
                    on_progress(ctx["buf"])
                ctx["buf"] = token
                if ss == ctx["buf"]:
                    on_progress(None)
                return

        if len(ctx["buf"]) > 0:
            on_progress(ctx["buf"])
            ctx["buf"] = ""

        ctx["buf_state"] = state
        on_progress(token)

    def _on_done(result):
        result["state"] = ctx["buf_state"]
        on_done(result)

    infer(
        context=input,
        state=state,
        on_progress=_on_progress,
        on_done=_on_done,
        forward_kwargs={
            "stopStrings": [
                "<|endoftext|>",
                "---",
                "Question:",
                "Full Answer in Markdown:",
            ]
        },
    )



if __name__ == "__main__":
    session = {"state": None}

    while True:
        print("")
        line_in = input("You> ").replace("\\n", "\n").strip()
        if line_in == "/reset":
            session["state"] = None
            print("State has been reset.")
            continue

        def on_progress(result):
            if result is None:
                print("")
                return
            print(result, end="")

        def on_done(result):
            session["state"] = result["state"]

        print("Bot> ", end="")
        chat(session["state"], line_in, on_progress, on_done)
