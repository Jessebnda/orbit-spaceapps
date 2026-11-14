#!/bin/bash
# Starts Flash Next for the hub, without the serve.sh tools (--agent, --mcp-servers-config, open).
# The hub launches this detached when /api/assistant needs the model; --sleep-idle-seconds unloads it after 5 min idle.
export LLAMA_MOE_STREAM_LOOKAHEAD=1
export LLAMA_MOE_STREAM_WAVE_CAP=200
export LLAMA_MOE_STREAM_PARTITION=1
export LLAMA_QWEN4EXP_SPARSE_FA=1

exec /Users/jesse/Projects/npanj-llama.cpp/build/bin/llama-server \
  -m /Users/jesse/models/qwen38-flash-next-uncensored/Qwen3.8-Flash-Next-Uncensored-IQ4XS-NGQ4.gguf \
  --host 127.0.0.1 --port 8080 \
  --moe-stream --moe-stream-cache 9 --moe-stream-io-threads 8 --moe-stream-direct \
  -ctk q8_0 -ctv q8_0 -c 16384 -ngl 99 -np 1 -fa on --jinja \
  --sleep-idle-seconds 300
