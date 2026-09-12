# The local AI stack

Eidolon talks to three servers you run yourself: a language model, a voice, and
an image generator. None of them are bundled — they are large, and which build
you want depends on your GPU — so this is how to get them.

Everything here assumes Windows with an NVIDIA card. The conductor only needs
the three ports, so any equivalent server that speaks the same API will do.

## Where they live

The servers live outside this repository, in one folder of your choosing:

```
<EIDOLON_AI_ROOT>/
  LLAMA_CPP/      llama-server.exe and its DLLs
  KOKORO_TTS/     Kokoro-FastAPI checkout with a .venv
  COMFY_UI/       ComfyUI portable
  MODELS/         .gguf weights
```

`EIDOLON_AI_ROOT` defaults to `..\..\AI\EIDOLON` relative to this folder — so
`G:\AI\EIDOLON` when the repo is at `G:\PROJECTS\eidolon`. Set the variable
if yours is somewhere else:

```powershell
$env:EIDOLON_AI_ROOT = "D:\ai\eidolon"
```

## Starting them

```bash
bun run stack:up       # starts whatever is down, waits for each to answer
bun run stack:status   # prints all five, including storage and the conductor
bun run stack:panes    # all three AI servers in one window, three panes
bun run stack:down     # stops the three AI servers
```

`stack:up` is the one to use: the batch files in this folder start a server and
return immediately, so on their own they tell you nothing about whether it came
up. `stack:up` polls each health endpoint and reports per service.

`stack:panes` puts all three in a single Windows Terminal window — llama.cpp
down the left, ComfyUI top right, Kokoro bottom right — so their logs sit side by
side instead of behind each other. It falls back to separate windows if
`wt.exe` is not installed.

ComfyUI runs with `--disable-auto-launch`, so it does not open a browser tab. Its
web UI is still there on http://127.0.0.1:8188 if you want to look at a workflow.

The batch files are here if you want to run one on its own, or read what flags
are being passed:

| File | Starts | Port |
|---|---|---|
| `start-llm.bat` | llama.cpp | 8080 |
| `start-tts.bat` | Kokoro-FastAPI | 8880 |
| `start-comfy.bat` | ComfyUI | 8188 |
| `start-panes.bat` | all three in one Windows Terminal window, split | |
| `start-all.bat` | all three in separate windows, no health checks | |
| `stop-all.bat` | stops all three | |

---

## 1. Layout

```
G:\AI\EIDOLON\
  MODELS\            every GGUF the LLM loads
    Qwen3.5-9B-heretic.Q6_K.gguf                 chat
    nomic-embed-text-v1.5.Q5_K_M.gguf            recall
    L3-8B-Stheno-v3.3-32K-NEO-V1-D_AU-Q5_K_M.gguf  (LLM_PROFILE=llama3)
  LLAMA_CPP\         llama.cpp server (CUDA 13.3 build + runtime)
  KOKORO_TTS\        Kokoro-FastAPI checkout + its own .venv
  COMFY_UI\          ComfyUI portable + embedded python
  START\             the launch scripts
  _dl\               download scratch, safe to delete
```

ComfyUI keeps its own weights under `COMFY_UI\ComfyUI\models\` because that is
where it looks. If you want them under `MODELS\` too, add an
`extra_model_paths.yaml` in the ComfyUI folder rather than moving files.

## 2. Ports

| Service | Port | Health check |
|---|---|---|
| llama.cpp (LLM) | `8080` | `curl http://127.0.0.1:8080/health` |
| ComfyUI (image) | `8188` | open `http://127.0.0.1:8188` |
| Kokoro (TTS) | `8880` | `http://127.0.0.1:8880/web/` |
| Eidolon conductor | `3000` | `curl http://127.0.0.1:3000/health` |

**Do not use port 5000 on this machine.** Windows reserves `4903-5002` for
Hyper-V/WSL, so a bind there fails while `netstat` shows nothing listening.
Check your own machine with:

```
netsh interface ipv4 show excludedportrange protocol=tcp
```

## 3. VRAM

Everything loaded at once, measured with `nvidia-smi` during a render while
the chat model was answering: **12.5 GB of 16.3 GB peak**.

| Service | Approx. VRAM |
|---|---|
| llama.cpp, Qwen3.5-9B Q6_K, 32k ctx, q4_0 KV, all 32 layers | ~6.5 GB |
| ComfyUI, SD 1.5 + IPAdapter FaceID, idle | ~0.9 GB |
| ComfyUI during a render | ~4.2 GB |
| llama.cpp embeddings, nomic-embed | ~0.2 GB |
| Kokoro | 0 GB (CPU) |

Only 8 of the 9B's 32 layers carry a KV cache - the rest are linear-attention
(GatedDeltaNet) and hold a fixed-size state - so 32k context costs about 300 MB
rather than the 1.5 GB a dense model of the same size would want.

If you hit an out-of-memory error, drop `EIDOLON_LLM_CTX` to `16384` before
launching `start-llm.bat`, or `EIDOLON_LLM_NGL` below 99 to move layers onto the
CPU. The first costs nothing for normal roleplay length; the second costs speed.

---

## 4. LLM — llama.cpp

**Downloads**

- Releases: <https://github.com/ggml-org/llama.cpp/releases>
- This build: `llama-b10819-bin-win-cuda-13.3-x64.zip`
- **And** the matching runtime: `cudart-llama-bin-win-cuda-13.3-x64.zip`
- Chat model (Q6_K): <https://huggingface.co/mradermacher/Qwen3.5-9B-heretic-GGUF>
- Embedder (Q5_K_M): <https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF>
- Previous chat model, still selectable with `LLM_PROFILE=llama3`:
  <https://huggingface.co/DavidAU/L3-8B-Stheno-v3.3-32K-Ultra-NEO-V1-IMATRIX-GGUF>

**Both zips extract into the same folder.** The main zip ships `ggml-cuda.dll`
but not the CUDA runtime it links against, so on its own the GPU is invisible
and llama.cpp silently runs on CPU.

Pick the CUDA version by GPU, not by habit:

| GPU | Build |
|---|---|
| RTX 50-series (Blackwell, `sm_120`) | **cuda-13.3** |
| RTX 40-series and older | cuda-12.4 is fine |

CUDA 12.4 predates Blackwell — `sm_120` needs 12.8 or newer — so a 50-series card
on the 12.4 build gets no kernels for its own architecture.

**Verify before anything else:**

```
cd G:\AI\EIDOLON\LLAMA_CPP
llama-server.exe --list-devices
```

You must see your card. `Available devices: (none)` means the cudart zip is
missing or you took the wrong CUDA build.

**Run:** `START\start-llm.bat`

```
llama-server.exe ^
 -m "G:\AI\EIDOLON\MODELS\L3-8B-Stheno-v3.3-32K-NEO-V1-D_AU-Q5_K_M.gguf" ^
 --host 127.0.0.1 --port 8080 ^
 -ngl 99 -c 16384 -fa on -ctk q8_0 -ctv q8_0 ^
 --jinja -a eidolon-llm
```

| Flag | Why |
|---|---|
| `-ngl 99` | put every layer on the GPU |
| `-c 16384` | context window |
| `-fa on` | flash attention |
| `-ctk q8_0 -ctv q8_0` | quantise the KV cache, roughly halves its size |
| `--jinja` | use the model's own chat template |
| `-a eidolon-llm` | the name the API reports, matches `LLM_MODEL` |

Measured on the 5070 Ti: **120 tok/s generate, 276 tok/s prompt**. If you see
single digits you are on CPU — go back to `--list-devices`.

---

## 5. TTS — Kokoro-FastAPI

**Source:** <https://github.com/remsky/Kokoro-FastAPI>
**Model:** <https://huggingface.co/hexgrad/Kokoro-82M> (fetched by the script below)

```
cd G:\AI\EIDOLON
git clone https://github.com/remsky/Kokoro-FastAPI.git KOKORO_TTS
cd KOKORO_TTS
uv venv --python 3.12
uv sync --extra gpu-cu128
uv pip install "torch==2.8.0" --index-url https://download.pytorch.org/whl/cu128 --reinstall-package torch
.venv\Scripts\python.exe docker/scripts/download_model.py --output api/src/models/v1_0
```

**Two traps here, both Windows-specific.**

1. The bundled `start-gpu.ps1` installs the `[gpu]` extra, which is **cu126** —
   no Blackwell kernels. 50-series needs `gpu-cu128`.
2. `pyproject.toml` gates every torch source on `platform_machine == 'x86_64'`,
   but Windows reports `AMD64`. No marker matches, so uv installs plain CPU
   torch and the service runs silently on CPU. That is why the explicit
   `uv pip install ... --index-url .../cu128` line above is not optional.

**Verify:**

```
.venv\Scripts\python.exe -c "import torch;print(torch.__version__, torch.cuda.is_available())"
```

Expect `2.8.0+cu128 True`. Anything ending `+cpu` means trap 2 bit you.

**Run:** `START\start-tts.bat` — startup should print `Model warmed up on cuda`
and `68 voice packs loaded`.

**Test:**

```
curl http://127.0.0.1:8880/v1/audio/speech -H "Content-Type: application/json" ^
 -d "{\"model\":\"kokoro\",\"input\":\"Hello there.\",\"voice\":\"af_heart\",\"response_format\":\"mp3\"}" ^
 -o test.mp3
```

Round trip for a short sentence is about **0.3 s**. The API is OpenAI-compatible,
and there is a browser player at `http://127.0.0.1:8880/web/`.

Docker is an alternative if you would rather not manage a venv — use the
Blackwell tag, not `latest`:

```
docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest-cu128
```

---

## 6. Images — ComfyUI

**Portable build:** <https://github.com/comfyanonymous/ComfyUI/releases>

Two stacks are wired up. Switch with `IMAGE_PRESET` in the conductor's `.env`;
resolution, step count, CFG and the face adapter all move together, because they
are not independent of the checkpoint.

| `IMAGE_PRESET` | Model | Face | Size | Steps / CFG | Measured |
|---|---|---|---|---|---|
| `sdxlPulid` (default) | RealVisXL V5 Lightning | PuLID | 832×1216 | 6 / 2 | ~5 s |
| `chromaPulid` | Chroma1-HD Q5_K_M (FLUX, uncensored) | PuLID-Flux | 832×1216 | 16 / 4 | ~44 s, 15.3 GB peak |
| `sd15FaceId` | CyberRealistic SD 1.5 | IPAdapter FaceID PlusV2 | 512×768 → 1024×1536 hi-res | 28 / 6 | ~5 s |

Chroma is the photoreal one: measured side by side against the other two on the
same prompt, seed and face, it is the only one that does not produce the smooth
"doll" skin. It costs about nine times as long per photo and peaks at 15.3 GB of
16.3 GB with the 9B chat model resident, which is tight - drop to
`Chroma1-HD-Q4_K_M.gguf` (5.18 GB, about 1.2 GB cheaper) if a render ever OOMs.
The chat model keeps answering throughout, at ~52 tok/s instead of 87 while a
render is running.

Do not mix them by hand. SD 1.5 tears a 832×1216 canvas into two bodies, and the
six steps at CFG 2 that a distilled Lightning model wants return noise on an
ordinary checkpoint.

### You do not need a separate VAE or text encoder

Both checkpoints are **full** checkpoints: the VAE and text encoders are already
inside, and `CheckpointLoaderSimple` outputs all three. Separate VAE/encoder
files are only needed for split architectures like Flux or SD3.

### sd15FaceId — IPAdapter FaceID PlusV2

Custom node: <https://github.com/cubiq/ComfyUI_IPAdapter_plus>

Weights, in these exact folders under `COMFY_UI\ComfyUI\models\`:

| File | Folder | Source |
|---|---|---|
| `cyberrealistic_final_pruned_fp16.safetensors` | `checkpoints\` | <https://civitai.com/models/15003> |
| `ip-adapter-faceid-plusv2_sd15.bin` | `ipadapter\` | <https://huggingface.co/h94/IP-Adapter-FaceID> |
| `ip-adapter-faceid-plusv2_sd15_lora.safetensors` | `loras\` | same repo |
| `CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors` | `clip_vision\` | <https://huggingface.co/h94/IP-Adapter> (`models/image_encoder`) |
| 5 × `.onnx` (buffalo_l) | `insightface\models\buffalo_l\` | <https://github.com/deepinsight/insightface/releases/tag/v0.7> |

Three things this gets wrong quietly:

- **The LoRA is not optional.** `IPAdapterUnifiedLoaderFaceID` loads the adapter
  *and* its companion LoRA, and applies the LoRA to the model it returns. The
  sampler has to be handed that model, not the checkpoint's.
- **The CLIP-Vision filename is matched by regex**, not by content. The loader
  looks for `ViT.H.14.*s32B.b79K`, so a file called `clip_vision_vit_h.safetensors`
  is never found and the node raises "ClipVision model not found." Hardlink it
  under the canonical name rather than copying 2.5 GB twice.
- **FaceID wants `buffalo_l`, not `antelopev2`.** PuLID's antelopev2 does not
  satisfy it; both can sit side by side.

Provider is `CPU` on purpose. The embedded `onnxruntime` ships without
`CUDAExecutionProvider`, so asking for CUDA only buys a fallback warning — and
face analysis staying off the card is worth ~200 MB.

**Confirm the nodes loaded** once the server is up:

```
curl -s http://127.0.0.1:8188/object_info | findstr /i ipadapterfaceid
```

### chromaPulid — Chroma1-HD + PuLID-Flux

Custom node: <https://github.com/PaoloC68/ComfyUI-PuLID-Flux-Chroma>
(ComfyUI itself already knows Chroma: `CLIPLoader` has a `chroma` type, and
`UnetLoaderGGUF` comes from the ComfyUI-GGUF node that was already installed.)

Unlike a checkpoint, this is three separate files:

| File | Folder | Source |
|---|---|---|
| `Chroma1-HD-Q5_K_M.gguf` (6.2 GB) | `diffusion_models\` | <https://huggingface.co/silveroxides/Chroma1-HD-GGUF> |
| `t5xxl_fp8_e4m3fn.safetensors` (4.6 GB) | `text_encoders\` | <https://huggingface.co/comfyanonymous/flux_text_encoders> |
| `ae.safetensors` (320 MB) | `vae\` | FLUX VAE, ungated copy |
| `pulid_flux_v0.9.1.safetensors` (1.1 GB) | `pulid\` | <https://huggingface.co/guozinan/PuLID> |

Q5_K_M rather than Q6_K on purpose: the budget beside the 9B chat model is about
8 GB, and Q6_K's 7.13 GB plus the VAE and compute buffers overruns it.

ComfyUI loads the text encoder and the transformer one after the other rather
than together, so the ceiling is whichever is larger, not their sum. That is the
only reason 6.2 GB + 4.6 GB fits at all.

### sdxlPulid — PuLID

Custom node: <https://github.com/cubiq/PuLID_ComfyUI>

Python dependencies, into the **embedded** interpreter:

```
cd G:\AI\EIDOLON\COMFY_UI
.\python_embeded\python.exe -m pip install facexlib insightface onnxruntime ftfy timm
```

`ftfy` and `timm` are the two that are usually missing; without them the node
fails to import and the PuLID nodes never appear.

| File | Folder | Source |
|---|---|---|
| `RealVisXL_V5.0_Lightning_fp16.safetensors` | `checkpoints\` | <https://huggingface.co/SG161222/RealVisXL_V5.0_Lightning> |
| `ip-adapter_pulid_sdxl_fp16.safetensors` | `pulid\` | <https://huggingface.co/guozinan/PuLID> |
| 5 × `.onnx` (antelopev2) | `insightface\models\antelopev2\` | <https://huggingface.co/MonsterMMORPG/tools> |
| `taesdxl_decoder.pth` | `vae_approx\` | <https://github.com/madebyollin/taesd> |

antelopev2 is `1k3d68`, `2d106det`, `genderage`, `glintr100`, `scrfd_10g_bnkps`.
Extract the files directly into `antelopev2\`, not into a nested subfolder.

```
curl -s http://127.0.0.1:8188/object_info | findstr /i pulid
```

Expect `ApplyPulid`, `ApplyPulidAdvanced`, `PulidEvaClipLoader`,
`PulidInsightFaceLoader`, `PulidModelLoader`.

### The launch flags

**Run:** `START\start-comfy.bat`

```
.\python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build ^
 --port 8188 --fp8_e4m3fn-unet --preview-method taesd ^
 --fast fp16_accumulation cublas_ops --reserve-vram 0.8
```

| Flag | What it does |
|---|---|
| `--fp8_e4m3fn-unet` | stores UNet weights as fp8 instead of fp16. Roughly halves the diffusion model's VRAM. Native on Blackwell. |
| `--preview-method taesd` | live latent previews during sampling, decoded by the tiny `taesdxl_decoder.pth`. Without that file it silently shows nothing. |
| `--fast` | opt-in optimisations: `fp16_accumulation`, `fp8_matrix_mult`, `cublas_ops`, `autotune`. |
| `--reserve-vram 0.8` | leave 0.8 GB for the desktop and the other two servers. |

**On `--fast`:** bare `--fast` enables everything including `autotune` and
`fp8_matrix_mult`, which ComfyUI itself labels untested and possibly
quality-degrading. The script uses the safe pair
`--fast fp16_accumulation cublas_ops`. Add the others once you have a baseline
you trust.

Measured: **832×1216 at 6 steps in 8.2 s**, dpmpp_sde/karras, cfg 1.6. Lightning
models want low steps and low cfg — normal SDXL settings (25 steps, cfg 7) look
washed out.

---

## 7. Wiring the conductor

`apps\conductor\.env`:

```
LLM_API_URL="http://127.0.0.1:8080/v1"
LLM_MODEL="eidolon-llm"
TTS_API_URL="http://127.0.0.1:8880/v1"
COMFYUI_URL="http://127.0.0.1:8188"
```

`LLM_MODEL` must match `-a` from the llama.cpp command.

Check it sees everything:

```
curl http://127.0.0.1:3000/health
```

```json
"services": { "sqlite": "healthy", "lancedb": "healthy",
              "llm": "healthy", "comfyui": "healthy" }
```

**TTS is not consumed by the conductor yet.** The server runs and answers, but
nothing calls it — no protocol event carries an audio URL. `TTS_API_URL` is
there for when that lands.

---

## 8. Daily use

```
G:\AI\EIDOLON\START\start-all.bat     three windows: LLM, image, TTS
G:\AI\EIDOLON\START\stop-all.bat      stop all three
```

Then start the conductor from the repo: `bun run dev:conductor`.

Order does not matter; the conductor reports each service's health and degrades
rather than crashing if one is down.

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| LLM at 5-10 tok/s | CUDA backend not loaded | `--list-devices`; add the cudart zip |
| `Available devices: (none)` | missing `cudart64_13.dll` / `cublas64_13.dll` | extract the cudart zip into `LLAMA_CPP\` |
| `couldn't bind HTTP server socket` on 5000 | Windows reserved port range | use 8080 |
| Kokoro slow, `CUDA: False` | CPU torch from the `AMD64` marker miss | reinstall torch from the cu128 index |
| PuLID nodes absent | `ftfy` / `timm` missing | pip install into `python_embeded` |
| PuLID runs but no face match | antelopev2 nested a folder too deep | files go directly in `antelopev2\` |
| No latent previews | `taesdxl_decoder.pth` missing | put it in `vae_approx\` |
| ComfyUI OOM with the LLM up | 16 GB shared three ways | lower `-c` on llama, raise `--reserve-vram` |
| Empty LLM completions | a stop sequence matches the model's opening token | the model emits `PLAYER:` first; do not use it as a stop |

## 10. Versions verified

| Component | Version |
|---|---|
| llama.cpp | b10819 (`6a1a922d2`), CUDA 13.3 |
| ComfyUI portable | Python 3.13.14, torch 2.13.0+cu130 |
| Kokoro-FastAPI | 0.8.2-rc1, torch 2.8.0+cu128 |
| NVIDIA driver | 610.88 |
