import copy
import tqdm
import rwkvstic.tokenizer as tokenizer
from typing import List

# this is for like, being useful
import time





class RWKVMaster():
    stop_event = False
    def sample_logits_typical(self, logits, temp=1.0, tau=0.95, **kwargs):
        probs = F.softmax(logits.float(), dim=-1)
        logits = -torch.log(probs)
        ent = torch.nansum(logits * probs, dim=-1, keepdim=True)
        shifted_logits = torch.abs(logits - ent)
        sorted_ids = torch.argsort(shifted_logits)
        sorted_logits = shifted_logits[sorted_ids]
        sorted_probs = probs[sorted_ids]
        cumulative_probs = torch.cumsum(sorted_probs, dim=-1).cpu().numpy()
        cutoff = np.sum(cumulative_probs < tau)
        probs[shifted_logits > sorted_logits[cutoff]] = 0
        if temp != 1.0:
            probs = probs ** (1.0 / temp)
        out = torch.multinomial(probs, num_samples=1)[0]
        return int(out)
    def __init__(self, model, emptyState, initTensor=lambda x: x, intTensor=lambda x: x, sampler=sample_logits_typical, tokPath=None):
        self.model = model

        self.tokenizer = tokenizer.tokenizer(tokPath)

        if emptyState is not None:
            self.emptyState = emptyState.clone()
            self.myState = emptyState.clone()
        else:
            self.emptyState = None
            self.myState = None
            
        
        self.lastToken = [187]
        self.initTensor = initTensor
        self.intTensor = intTensor
        self.sampler = sampler
    logging=False
    def forward(self, state=None, temp: float = 1.0, top_p_usual: float = 0.8, number=1, stopStrings: List[str] = ["<|endoftext|>"], stopTokens: List[int] = [0], progressLambda=(lambda args: print(args["current"],end="",flush=True)) if logging else (lambda x:x), end_adj=0.0):
        ostate = self.myState if state is None else state
        tolens = []
        for i in range(number):
            logits, ostate = self.model.forward(
                self.intTensor(self.lastToken), ostate)
            if RWKVMaster.stop_event:
                RWKVMaster.stop_event = False
                break
            try:
                logits[0] += (end_adj)
            except:
                pass
            self.myState = ostate
            sampled = self.sample(
                logits, temp, top_p_usual) if self.sampler is not None else logits
            
            try:
                self.lastToken = [sampled.cpu().numpy()[0]]
            except:
                self.lastToken = [sampled]

            tolens += [self.lastToken[0]]
            sampled = self.tokenizer.decode(tolens)
            progressLambda(
                {"logits": logits, "state": ostate, "output": sampled, "progress": i, "tokens": tolens, "total": number, "current": self.tokenizer.decode([tolens[-1]])})
            if tolens[-1] in stopTokens:
                break
            if sampled.endswith((*stopStrings,)):
                break

        return {"logits": logits, "state": ostate, "output": sampled}

    def loadContext(self, newctx: str = "", ctx: str = "\n\n", statex=None, progressCallBack=lambda x: x, batch=20):

        def doContext(model, ctx, newctx, statex, progressCallBack=lambda x: x):
            tt = time.time()
            nnewctx = newctx
            ll = len(newctx)
            btch = batch
            o = (None, statex)

            while len(newctx) > 0:
                print(len(newctx)/ll * 100, "%", "remaining")
                m = newctx[:btch]
                newctx = newctx[btch:]
                if o[1] is not None:
                    o = model.forward(m, copy.deepcopy(o[1]))
                else:
                    o = model.forward(m, None)
                progressCallBack(m)
                

            # print("loaded context in", time.time()-tt, "seconds")
            # print(o[0][0])
            return nnewctx, o[1]


        def rnndoContext(model, ctx, newctx, statex, progressCallBack=lambda x: x):

            for i in tqdm.tqdm(range(len(newctx))):

                x = ctx+newctx[:i]

                o = model.forward([x[-1]], statex)
                statex = o[1]
                progressCallBack(x)
            return ctx+newctx, o[1]


        statex = self.myState if statex is None else statex
        # print(newctx)
        ctx = self.tokenizer.encode(ctx)
        newctx = self.tokenizer.encode(newctx)
        self.lastToken = [ctx[-1]]
        if self.model.__dict__.get("RnnOnly", False):
            ctx, state = rnndoContext(
                self.model, ctx, self.intTensor(newctx), statex, progressCallBack)
        else:
            ctx, state = doContext(
                self.model, ctx, self.intTensor(newctx), statex, progressCallBack)
        
        self.myState = state
        return ctx, state

    def sample(self, ozut, temp: float = 1.0, top_p_usual: float = 0.8) -> int:
        return self.sampler(ozut, temp, top_p_usual)



    def decode(self, x):
        return self.tokenizer.decode(x)

    def encode(self, x):
        return self.tokenizer.encode(x)

    def setState(self, state):
        self.myState = copy.deepcopy(state[0])
        self.lastToken = state[1]

    def getState(self):
        return copy.deepcopy(self.myState), self.lastToken

    def resetState(self):
        self.myState = copy.deepcopy(self.emptyState)
        self.lastToken = [187]
