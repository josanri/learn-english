"""Speed patches for Qwen3-TTS. `install(model)` applies both.

1. Code predictor. For each audio frame the talker calls `code_predictor.generate()`, a full
   Hugging Face generate loop that makes 15 tiny forward passes. Its Python overhead costs much
   more than the GPU work. The patch replaces that call with a hand-written loop over a static
   KV cache, recorded once per batch size as a CUDA graph and replayed for each frame. The
   sampling is the same: temperature, then top-k (top-p 1.0 is a no-op), drawn with the
   Gumbel-max trick so that the random numbers stay inside the graph.
2. Speech decoder. The library decodes the whole batch at once, padded to its longest item.
   At 16 items that fills the 12 GB card and takes a minute instead of a second, so the patch
   decodes in groups of DECODE_GROUP.
"""
from types import SimpleNamespace

import torch
import torch.nn.functional as F
from qwen_tts.core.models.modeling_qwen3_tts import rotate_half

DECODE_GROUP = 4


class FastCodePredictor:
    def __init__(self, predictor, use_graph=True):
        self.predictor = predictor
        self.use_graph = use_graph
        self.original = predictor.generate
        config = predictor.config
        self.steps = config.num_code_groups - 1
        self.heads = config.num_attention_heads
        self.kv_heads = config.num_key_value_heads
        self.head_dim = getattr(config, "head_dim", config.hidden_size // config.num_attention_heads)
        self.graphs = {}
        weight = predictor.lm_head[0].weight
        positions = torch.arange(self.steps + 1, device=weight.device)[None]
        with torch.no_grad():
            cos, sin = predictor.model.rotary_emb(torch.zeros(1, device=weight.device, dtype=weight.dtype),
                                                  positions)
        self.cos, self.sin = cos[:, None], sin[:, None]

    def __call__(self, inputs_embeds, do_sample=True, top_k=50, top_p=1.0, temperature=1.0, **kwargs):
        if top_p is not None and top_p < 1.0:
            return self.original(inputs_embeds=inputs_embeds, do_sample=do_sample, top_k=top_k, top_p=top_p,
                                 temperature=temperature, **kwargs)
        key = (inputs_embeds.shape[0], bool(do_sample), int(top_k or 0), float(temperature or 1.0))
        if not self.use_graph:
            static_in = inputs_embeds.detach()
            return SimpleNamespace(sequences=self.run(static_in, self.new_caches(static_in), *key[1:]))
        entry = self.graphs.get(key)
        if entry is None:
            entry = self.graphs[key] = self.capture(inputs_embeds, *key[1:])
        graph, static_in, static_out, _ = entry
        static_in.copy_(inputs_embeds)
        graph.replay()
        return SimpleNamespace(sequences=static_out.clone())

    def capture(self, sample, do_sample, top_k, temperature):
        static_in = sample.detach().clone()
        caches = self.new_caches(static_in)
        run = lambda: self.run(static_in, caches, do_sample, top_k, temperature)
        stream = torch.cuda.Stream()
        stream.wait_stream(torch.cuda.current_stream())
        with torch.no_grad(), torch.cuda.stream(stream):
            for _ in range(3):
                run()
        torch.cuda.current_stream().wait_stream(stream)
        graph = torch.cuda.CUDAGraph()
        with torch.no_grad(), torch.cuda.graph(graph):
            static_out = run()
        # The graph writes to the caches by address, so they must live as long as the graph does.
        return graph, static_in, static_out, caches

    def new_caches(self, embeds):
        shape = (embeds.shape[0], self.kv_heads, self.steps + 1, self.head_dim)
        return [(embeds.new_zeros(shape), embeds.new_zeros(shape)) for _ in self.predictor.model.layers]

    def run(self, embeds, caches, do_sample, top_k, temperature):
        predictor = self.predictor
        codes = []
        for position in range(self.steps + 1):
            if position < 2:
                x = embeds[:, position:position + 1]
            else:
                x = predictor.model.codec_embedding[position - 2](codes[-1])
            hidden = self.forward(predictor.small_to_mtp_projection(x), position, caches)
            if position == 0:
                continue
            logits = predictor.lm_head[position - 1](hidden[:, -1]).float()
            codes.append(self.pick(logits, do_sample, top_k, temperature))
        return torch.cat(codes, dim=1)

    def forward(self, hidden, position, caches):
        batch = hidden.shape[0]
        cos, sin = self.cos[:, :, position:position + 1], self.sin[:, :, position:position + 1]
        for layer, (keys, values) in zip(self.predictor.model.layers, caches):
            attn = layer.self_attn
            normed = layer.input_layernorm(hidden)
            q = attn.q_norm(attn.q_proj(normed).view(batch, 1, self.heads, self.head_dim)).transpose(1, 2)
            k = attn.k_norm(attn.k_proj(normed).view(batch, 1, self.kv_heads, self.head_dim)).transpose(1, 2)
            v = attn.v_proj(normed).view(batch, 1, self.kv_heads, self.head_dim).transpose(1, 2)
            q = q * cos + rotate_half(q) * sin
            k = k * cos + rotate_half(k) * sin
            keys[:, :, position:position + 1].copy_(k)
            values[:, :, position:position + 1].copy_(v)
            out = F.scaled_dot_product_attention(q, keys[:, :, :position + 1], values[:, :, :position + 1],
                                                 scale=attn.scaling, enable_gqa=True)
            hidden = hidden + attn.o_proj(out.transpose(1, 2).reshape(batch, 1, -1))
            hidden = hidden + layer.mlp(layer.post_attention_layernorm(hidden))
        return self.predictor.model.norm(hidden)

    @staticmethod
    def pick(logits, do_sample, top_k, temperature):
        if not do_sample:
            return logits.argmax(dim=-1, keepdim=True)
        if top_k:
            logits, indices = logits.topk(top_k, dim=-1)
        else:
            indices = None
        probs = F.softmax(logits / temperature, dim=-1)
        choice = (probs / torch.empty_like(probs).exponential_()).argmax(dim=-1, keepdim=True)
        return indices.gather(-1, choice) if indices is not None else choice


def grouped_decode(decode):
    def wrapper(encoded):
        if not isinstance(encoded, list) or len(encoded) <= DECODE_GROUP:
            return decode(encoded)
        wavs, rate = [], None
        for start in range(0, len(encoded), DECODE_GROUP):
            part, rate = decode(encoded[start:start + DECODE_GROUP])
            wavs += part
        return wavs, rate
    return wrapper


def install(model):
    """Patches a loaded Qwen3TTSModel. Returns the code predictor patch so that a test can compare it."""
    predictor = model.model.talker.code_predictor
    fast = FastCodePredictor(predictor)
    predictor.generate = fast
    tokenizer = model.model.speech_tokenizer
    tokenizer.decode = grouped_decode(tokenizer.decode)
    return fast
