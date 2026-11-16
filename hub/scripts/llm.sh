#!/bin/bash
# Starts the on-board model for the hub, with no computer-control tools (only the hub agent's own tools).
# LLAMA_SERVER: llama-server from the npanj/llama.cpp fork. ORBIT_MODEL: the local .gguf (open weights, run only locally).
# The hub launches this detached when /api/assistant needs the model; --sleep-idle-seconds unloads it after 5 min idle.
export LLAMA_MOE_STREAM_LOOKAHEAD=1
export LLAMA_MOE_STREAM_WAVE_CAP=200
export LLAMA_MOE_STREAM_PARTITION=1
export LLAMA_QWEN4EXP_SPARSE_FA=1

# --cache-ram: llama-server keeps up to 8 GiB of old prompts in RAM by default; one slot already keeps the live one.
exec "${LLAMA_SERVER:-$HOME/Projects/npanj-llama.cpp/build/bin/llama-server}" \
  -m "${ORBIT_MODEL:-$HOME/models/orbit-llm.gguf}" \
  --host 127.0.0.1 --port 8080 \
  --moe-stream --moe-stream-cache 9 --moe-stream-io-threads 8 --moe-stream-direct \
  -ctk q8_0 -ctv q8_0 -c 16384 -ngl 99 -np 1 -fa on --jinja \
  --cache-ram 256 \
  --sleep-idle-seconds 300
