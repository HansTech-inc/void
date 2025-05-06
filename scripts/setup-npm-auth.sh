#!/bin/bash

# Script to set up npm authentication for GitHub packages

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN environment variable is not set"
  echo "Please set it with: export GITHUB_TOKEN=your_github_token"
  exit 1
fi

# Create or update .npmrc file with proper GitHub authentication
cat > .npmrc << EOF
disturl="https://electronjs.org/headers"
target="34.3.2"
ms_build_id="11161073"
runtime="electron"
build_from_source="true"
legacy-peer-deps="true"
timeout=180000
@microsoft:registry=https://npm.pkg.github.com
@vscode:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
EOF

echo "npm authentication configured successfully"
