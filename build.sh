#!/bin/bash
# Copy frontend/public to dist for Vercel
mkdir -p dist
cp -r frontend/public/* dist/
echo "Build complete - files copied to dist"
