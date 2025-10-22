#!/bin/bash
# 日本語プロンプト対応 Gemini CLI
export $(cat /workspaces/MKG-app/.env.gemini | xargs)
export LANG=C.UTF-8

if [ -z "$1" ]; then
  echo "Usage: gemini 'ここに日本語で質問'"
  exit 1
fi

gemini -p "$1"
