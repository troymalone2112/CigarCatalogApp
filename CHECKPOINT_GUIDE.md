# Checkpoint Guide

This guide explains how to use the checkpoint system to create safe restore points during development.

## Quick Start

### Create a Checkpoint

**Option 1: Using npm script (recommended)**
```bash
npm run checkpoint
```

**Option 2: Direct script execution**
```bash
./create_checkpoint.sh "Your checkpoint message here"
```

**Option 3: Interactive mode**
```bash
./create_checkpoint.sh
# Script will prompt you for a description
```

## How It Works

1. **Check for changes**: The script checks if there are any uncommitted changes
2. **Select files**: Choose which files to include:
   - `[a]` All changes (default)
   - `[s]` Source files only (`src/`, config files)
   - `[c]` Custom selection (interactive staging)
3. **Create commit**: Creates a commit with:
   - Prefix: "Checkpoint:"
   - Your description
   - Timestamp
   - Revert instructions in the commit message
4. **Optional tag**: Optionally create a git tag for easy reference

## Example Usage

```bash
# After completing a feature
npm run checkpoint
# Enter: "Fixed humidor edit button functionality"

# Before making risky changes
npm run checkpoint
# Enter: "Before refactoring API layer"

# With inline message
./create_checkpoint.sh "Added stats page with filters"
```

## Reverting to a Checkpoint

### View Recent Checkpoints
```bash
git log --oneline --grep="Checkpoint:"
```

### Revert to a Checkpoint (Safe - creates undo commit)
```bash
git revert <commit-hash>
# Example: git revert a20af0f
```
This creates a new commit that undoes the changes, preserving history.

### Reset to a Checkpoint (Destructive - loses later commits)
```bash
git reset --hard <commit-hash>
# Example: git reset --hard a20af0f
```
⚠️ **Warning**: This permanently discards all commits after the checkpoint!

### Checkout a Tagged Checkpoint
```bash
# List all tags
git tag -l

# Checkout a specific tag
git checkout checkpoint-20250130-143000
```

## When to Create Checkpoints

✅ **DO create checkpoints:**
- After completing a major feature
- Before making risky refactors
- When everything is working well
- Before major dependency updates
- After fixing critical bugs

❌ **DON'T create checkpoints:**
- For every small change (use normal commits)
- When code is broken (fix first, then checkpoint)
- For temporary experiments (use branches instead)

## Best Practices

1. **Descriptive messages**: Use clear, specific descriptions
   - Good: "Added stats page with 30d/6m/12m/all-time filters"
   - Bad: "Fixed stuff"

2. **Create before risky changes**: Always checkpoint before:
   - Large refactors
   - Dependency updates
   - Breaking API changes

3. **Tag important milestones**: Use tags for:
   - Major releases
   - Pre-deployment states
   - Critical bug fixes

4. **Review before committing**: Check `git status` to ensure you're committing the right files

## Troubleshooting

### "Not in a git repository"
- Make sure you're in the project root directory
- Initialize git if needed: `git init`

### "No changes to commit"
- Your working directory is clean
- No checkpoint needed - everything is already committed

### Script won't execute
```bash
chmod +x create_checkpoint.sh
```

## Integration with Workflow

The checkpoint script integrates with your normal git workflow:

```bash
# Normal development
git add .
git commit -m "WIP: working on feature"

# Create checkpoint when feature is complete
npm run checkpoint
# Enter: "Completed feature X"

# Continue development
git add .
git commit -m "WIP: next feature"

# If something breaks, revert to checkpoint
git revert <checkpoint-hash>
```

## Example Session

```bash
$ npm run checkpoint
📋 Current git status:
 M src/screens/HumidorListScreen.tsx

Files to include in checkpoint:
  [a] All changes
  [s] Source files only (src/)
  [c] Custom selection
Choose option (default: a): a
📦 Staging all changes...
💾 Creating checkpoint commit...
[main a20af0f] Checkpoint: Fixed humidor edit button functionality
 1 file changed, 67 insertions(+), 183 deletions(-)

✅ Checkpoint created successfully!
📌 Commit Hash: a20af0f

To revert to this checkpoint:
  git revert a20af0f  (creates undo commit)
  git reset --hard a20af0f  (discards later changes)

Create a tag for this checkpoint? (y/n, default: n): n

✨ Checkpoint complete!
```

