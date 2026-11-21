#!/usr/bin/env bash
# ============================================================
#  Vehicle Management CMS - One-click setup & run (Linux/macOS)
#  Run with:  ./run-linux.sh   (or: bash run-linux.sh)
# ============================================================
set -e
cd "$(dirname "$0")"

echo
echo " Vehicle Management CMS - Setup"
echo " =============================="
echo

# --- Check Node.js is installed ---
if ! command -v node >/dev/null 2>&1; then
    echo " [ERROR] Node.js is not installed."
    echo
    echo " Install Node.js LTS (version 20 or 22):"
    echo "   - Download from https://nodejs.org, or"
    echo "   - Ubuntu/Debian:  sudo apt install nodejs npm"
    echo "   - macOS (brew):   brew install node"
    echo
    echo " After installing, run this script again."
    exit 1
fi

echo " Node.js found: $(node -v)"
echo

# --- Install dependencies if needed ---
if [ ! -d "node_modules" ]; then
    echo " Installing dependencies... (first run only, may take a few minutes)"
    if command -v bun >/dev/null 2>&1; then
        bun install
    else
        npm install --legacy-peer-deps
    fi
else
    echo " Dependencies already installed. Skipping install."
fi

echo
echo " Starting the app..."
echo " When it is ready, open your browser at:  http://localhost:8080"
echo " Press Ctrl+C in this window to stop the app."
echo

npm run dev
