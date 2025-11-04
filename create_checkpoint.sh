#!/bin/bash

# Checkpoint Creation Script
# Usage: ./create_checkpoint.sh [message]
# Example: ./create_checkpoint.sh "Added stats page with filters"

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Get the checkpoint message
if [ -z "$1" ]; then
    echo -e "${YELLOW}Enter checkpoint description:${NC}"
    read -r CHECKPOINT_MESSAGE
else
    CHECKPOINT_MESSAGE="$1"
fi

# Check if there are any changes to commit
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  No changes to commit. Working directory is clean.${NC}"
    exit 0
fi

# Show current status
echo -e "${BLUE}📋 Current git status:${NC}"
git status --short

echo ""
echo -e "${YELLOW}Files to include in checkpoint:${NC}"
echo "  [a] All changes"
echo "  [s] Source files only (src/)"
echo "  [c] Custom selection"
read -r -p "Choose option (default: a): " FILE_OPTION
FILE_OPTION=${FILE_OPTION:-a}

case $FILE_OPTION in
    s)
        echo -e "${BLUE}📦 Staging source files only...${NC}"
        git add src/ package.json package-lock.json tsconfig.json app.json
        ;;
    c)
        echo -e "${BLUE}📦 Interactive staging...${NC}"
        git add -p
        ;;
    a|*)
        echo -e "${BLUE}📦 Staging all changes...${NC}"
        git add -A
        ;;
esac

# Create checkpoint message with timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
FULL_MESSAGE="Checkpoint: $CHECKPOINT_MESSAGE

Created: $TIMESTAMP

This checkpoint allows reverting to working state if future changes break functionality."

# Create the commit
echo ""
echo -e "${BLUE}💾 Creating checkpoint commit...${NC}"
git commit -m "$FULL_MESSAGE"

# Get the commit hash
COMMIT_HASH=$(git rev-parse --short HEAD)
FULL_COMMIT_HASH=$(git rev-parse HEAD)

echo ""
echo -e "${GREEN}✅ Checkpoint created successfully!${NC}"
echo -e "${GREEN}📌 Commit Hash: ${COMMIT_HASH}${NC}"
echo ""
echo -e "${YELLOW}To revert to this checkpoint:${NC}"
echo -e "  ${BLUE}git revert ${COMMIT_HASH}${NC}  (creates undo commit)"
echo -e "  ${BLUE}git reset --hard ${COMMIT_HASH}${NC}  (discards later changes)"
echo ""

# Ask if user wants to create a tag
read -r -p "Create a tag for this checkpoint? (y/n, default: n): " CREATE_TAG
CREATE_TAG=${CREATE_TAG:-n}

if [ "$CREATE_TAG" = "y" ] || [ "$CREATE_TAG" = "Y" ]; then
    TAG_NAME="checkpoint-$(date +%Y%m%d-%H%M%S)"
    git tag -a "$TAG_NAME" -m "Checkpoint: $CHECKPOINT_MESSAGE"
    echo -e "${GREEN}🏷️  Tag created: ${TAG_NAME}${NC}"
    echo -e "${YELLOW}To checkout this tag: ${BLUE}git checkout ${TAG_NAME}${NC}"
fi

echo ""
echo -e "${GREEN}✨ Checkpoint complete!${NC}"

