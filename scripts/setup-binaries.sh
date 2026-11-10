#!/usr/bin/env bash
set -e

LINUX_BIN_DIR="bin/linux"
mkdir -p "$LINUX_BIN_DIR"

echo "Baixando yt-dlp portátil para Linux..."
if [ ! -f "$LINUX_BIN_DIR/yt-dlp" ]; then
  curl -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" -o "$LINUX_BIN_DIR/yt-dlp"
  chmod +x "$LINUX_BIN_DIR/yt-dlp"
  echo "yt-dlp baixado com sucesso!"
else
  echo "yt-dlp já presente."
fi

echo "Baixando gallery-dl portátil para Linux..."
if [ ! -f "$LINUX_BIN_DIR/gallery-dl" ]; then
  curl -L "https://github.com/mikf/gallery-dl/releases/latest/download/gallery-dl.bin" -o "$LINUX_BIN_DIR/gallery-dl"
  chmod +x "$LINUX_BIN_DIR/gallery-dl"
  echo "gallery-dl baixado com sucesso!"
else
  echo "gallery-dl já presente."
fi

echo "Setup concluído para Linux!"
