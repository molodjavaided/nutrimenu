---
name: Writing Hookify Rules
description: This skill should be used when the user asks to "create a hookify rule", "write a hook rule", "configure hookify", "add a hookify rule", or needs guidance on hookify rule syntax and patterns.
version: 0.1.0
---

# Writing Hookify Rules

## Overview

Hookify rules are markdown files with YAML frontmatter that define patterns to watch for and messages to show when those patterns match. Rules are stored in `.claude/hookify.{rule-name}.local.md` files.

## Rule File Format

### Basic Structure

```markdown
---
name: rule-identifier
enabled: true
event: bash|file|stop|prompt|all
pattern: regex-pattern-here
---

Message to show Claude when this rule triggers.
Can include markdown formatting, warnings, suggestions, etc.
```

### Frontmatter Fields

**name** (required): Unique identifier — kebab-case, start with verb: warn, prevent, block, require, check

**enabled** (required): `true` / `false` — can toggle without deleting

**event** (required):
- `bash` — Bash tool commands
- `file` — Edit, Write, MultiEdit tools
- `stop` — When agent wants to stop
- `prompt` — When user submits a prompt
- `all` — All events

**action** (optional):
- `warn` — Show message but allow operation (default)
- `block` — Prevent operation

**pattern** (simple format): Regex matched against command (bash) or new_text (file)

### Advanced Format (Multiple Conditions)

```markdown
---
name: warn-env-file-edits
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.env$
  - field: new_text
    operator: contains
    pattern: API_KEY
---

You're adding an API key to a .env file. Ensure this file is in .gitignore!
```

**Condition fields:**
- Bash: `command`
- File: `file_path`, `new_text`, `old_text`, `content`
- Prompt: `user_prompt`

**Operators:** `regex_match`, `contains`, `equals`, `not_contains`, `starts_with`, `ends_with`

All conditions must match for rule to trigger.

## Event Type Guide

### bash Events — match Bash commands
```yaml
event: bash
pattern: rm\s+-rf
```

### file Events — match Edit/Write/MultiEdit
```yaml
event: file
pattern: console\.log\(
```

### stop Events — completion checklists
```yaml
event: stop
pattern: .*
```
Use for: reminders, required steps, process enforcement.

### prompt Events — match user input
```yaml
event: prompt
conditions:
  - field: user_prompt
    operator: contains
    pattern: deploy to production
```

## Pattern Writing Tips

**Escape special chars:** `.` → `\.`, `(` → `\(`

**Common metacharacters:** `\s` (whitespace), `\d` (digit), `+` (one+), `*` (zero+), `|` (OR)

**Common patterns:**
- Dangerous commands: `rm\s+-rf`, `chmod\s+777`
- Debug code: `console\.log\(`, `debugger`
- Sensitive files: `\.env$`, `\.pem$`

**Test patterns:**
```bash
python3 -c "import re; print(re.search(r'your_pattern', 'test text'))"
```

## File Organization

- **Location:** `.claude/` directory
- **Naming:** `.claude/hookify.{descriptive-name}.local.md`
- **Gitignore:** Add `.claude/*.local.md` to `.gitignore`

## Quick Reference

**Minimum viable rule:**
```markdown
---
name: my-rule
enabled: true
event: bash
pattern: dangerous_command
---

Warning message here
```
