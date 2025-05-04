#!/bin/bash

# auto-commit-push.sh - A script to automate git commit and push operations
# Usage: ./scripts/auto-commit-push.sh "Your commit message here"

# Set script to exit on error
set -e

echo "======== Git Auto Commit & Push ========"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "Error: git is not installed"
    exit 1
fi

# Check if the current directory is a git repository
if [ ! -d ".git" ]; then
    echo "Error: Not a git repository"
    exit 1
fi

# Check if there are any changes to commit
if [ -z "$(git status --porcelain)" ]; then
    echo "No changes to commit. Working tree clean."
    exit 0
fi

# Get commit message from argument or prompt for it
COMMIT_MESSAGE="$1"
if [ -z "$COMMIT_MESSAGE" ]; then
    echo "Enter commit message:"
    read -r COMMIT_MESSAGE
    if [ -z "$COMMIT_MESSAGE" ]; then
        COMMIT_MESSAGE="Update $(date +"%Y-%m-%d %H:%M:%S")"
        echo "Using default commit message: $COMMIT_MESSAGE"
    fi
fi

# Add all changes
echo "Adding all changes..."
git add .

# Commit changes
echo "Committing changes with message: $COMMIT_MESSAGE"
git commit -m "$COMMIT_MESSAGE"

# Push to remote
echo "Pushing to remote origin..."
git push origin "$(git rev-parse --abbrev-ref HEAD)"

echo "======== Done ========"