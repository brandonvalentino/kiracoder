#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Building Tau..."
swift build -c release 2>&1

APP_DIR="build/Tau.app/Contents"
mkdir -p "$APP_DIR/MacOS"

echo "Creating app bundle..."
cp .build/release/Tau "$APP_DIR/MacOS/Tau"
cp Tau/Info.plist "$APP_DIR/Info.plist"

echo "✅ Built: $(pwd)/build/Tau.app"
echo ""
echo "To install: cp -r build/Tau.app /Applications/"
echo "To run:     open build/Tau.app"
