#!/usr/bin/env python3
"""
Security Reminder Hook for Claude Code
Checks for security patterns in file edits and warns about potential vulnerabilities.

To enable: add to .claude/settings.local.json:
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [{ "type": "command", "command": "python3 .claude/hooks/security_reminder_hook.py" }]
      }
    ]
  }
}

To disable: set env variable ENABLE_SECURITY_REMINDER=0
"""

import json
import os
import random
import sys
from datetime import datetime

DEBUG_LOG_FILE = "/tmp/security-warnings-log.txt"


def debug_log(message):
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        with open(DEBUG_LOG_FILE, "a") as f:
            f.write(f"[{timestamp}] {message}\n")
    except Exception:
        pass


SECURITY_PATTERNS = [
    {
        "ruleName": "github_actions_workflow",
        "path_check": lambda path: ".github/workflows/" in path
        and (path.endswith(".yml") or path.endswith(".yaml")),
        "reminder": """You are editing a GitHub Actions workflow file. Be aware of these security risks:

1. **Command Injection**: Never use untrusted input (like issue titles, PR descriptions, commit messages) directly in run: commands without proper escaping
2. **Use environment variables**: Instead of ${{ github.event.issue.title }}, use env: with proper quoting

Example of UNSAFE pattern to avoid:
run: echo "${{ github.event.issue.title }}"

Example of SAFE pattern:
env:
  TITLE: ${{ github.event.issue.title }}
run: echo "$TITLE"

Risky inputs: github.event.issue.title/body, github.event.pull_request.title/body,
github.event.comment.body, github.event.commits.*.message, github.head_ref""",
    },
    {
        "ruleName": "child_process_exec",
        "substrings": ["child_process.exec", "exec(", "execSync("],
        "reminder": """⚠️ Security Warning: Using child_process.exec() can lead to command injection vulnerabilities.

Instead of:
  exec(`command ${userInput}`)

Use execFile with array args:
  execFile('command', [userInput])

This prevents shell injection by not invoking a shell.""",
    },
    {
        "ruleName": "new_function_injection",
        "substrings": ["new Function"],
        "reminder": "⚠️ Security Warning: Using new Function() with dynamic strings can lead to code injection vulnerabilities. Consider alternative approaches that don't evaluate arbitrary code.",
    },
    {
        "ruleName": "eval_injection",
        "substrings": ["eval("],
        "reminder": "⚠️ Security Warning: eval() executes arbitrary code and is a major security risk. Consider using JSON.parse() for data parsing or alternative design patterns.",
    },
    {
        "ruleName": "react_dangerously_set_html",
        "substrings": ["dangerouslySetInnerHTML"],
        "reminder": "⚠️ Security Warning: dangerouslySetInnerHTML can lead to XSS vulnerabilities if used with untrusted content. Ensure content is sanitized (e.g., DOMPurify), or use safe alternatives.",
    },
    {
        "ruleName": "document_write_xss",
        "substrings": ["document.write"],
        "reminder": "⚠️ Security Warning: document.write() can be exploited for XSS and has performance issues. Use DOM manipulation methods like createElement() and appendChild() instead.",
    },
    {
        "ruleName": "innerHTML_xss",
        "substrings": [".innerHTML =", ".innerHTML="],
        "reminder": "⚠️ Security Warning: Setting innerHTML directly can lead to XSS vulnerabilities. Use textContent for plain text, or sanitize HTML with DOMPurify before setting innerHTML.",
    },
    {
        "ruleName": "sql_injection",
        "substrings": ["SELECT * FROM", "INSERT INTO", "UPDATE ", "DELETE FROM"],
        "reminder": "⚠️ Security Warning: Raw SQL detected. Always use parameterized queries or an ORM (like Prisma) to prevent SQL injection. Never concatenate user input into SQL strings.",
    },
    {
        "ruleName": "hardcoded_secret",
        "substrings": ["API_KEY=", "SECRET=", "PASSWORD=", "api_key:", "secret_key:"],
        "reminder": "⚠️ Security Warning: Possible hardcoded secret detected. Use environment variables (process.env.VAR_NAME) and store secrets in .env.local (never commit to git).",
    },
]


def get_state_file(session_id):
    state_dir = os.path.expanduser("~/.claude")
    return os.path.join(state_dir, f"security_warnings_state_{session_id}.json")


def cleanup_old_state_files():
    try:
        state_dir = os.path.expanduser("~/.claude")
        if not os.path.exists(state_dir):
            return
        current_time = datetime.now().timestamp()
        thirty_days_ago = current_time - (30 * 24 * 60 * 60)
        for filename in os.listdir(state_dir):
            if filename.startswith("security_warnings_state_") and filename.endswith(".json"):
                file_path = os.path.join(state_dir, filename)
                try:
                    if os.path.getmtime(file_path) < thirty_days_ago:
                        os.remove(file_path)
                except (OSError, IOError):
                    pass
    except Exception:
        pass


def load_state(session_id):
    state_file = get_state_file(session_id)
    if os.path.exists(state_file):
        try:
            with open(state_file, "r") as f:
                return set(json.load(f))
        except (json.JSONDecodeError, IOError):
            return set()
    return set()


def save_state(session_id, shown_warnings):
    state_file = get_state_file(session_id)
    try:
        os.makedirs(os.path.dirname(state_file), exist_ok=True)
        with open(state_file, "w") as f:
            json.dump(list(shown_warnings), f)
    except IOError:
        pass


def check_patterns(file_path, content):
    normalized_path = file_path.lstrip("/")
    for pattern in SECURITY_PATTERNS:
        if "path_check" in pattern and pattern["path_check"](normalized_path):
            return pattern["ruleName"], pattern["reminder"]
        if "substrings" in pattern and content:
            for substring in pattern["substrings"]:
                if substring in content:
                    return pattern["ruleName"], pattern["reminder"]
    return None, None


def extract_content_from_input(tool_name, tool_input):
    if tool_name == "Write":
        return tool_input.get("content", "")
    elif tool_name == "Edit":
        return tool_input.get("new_string", "")
    elif tool_name == "MultiEdit":
        edits = tool_input.get("edits", [])
        return " ".join(edit.get("new_string", "") for edit in edits)
    return ""


def main():
    if os.environ.get("ENABLE_SECURITY_REMINDER", "1") == "0":
        sys.exit(0)

    if random.random() < 0.1:
        cleanup_old_state_files()

    try:
        input_data = json.loads(sys.stdin.read())
    except json.JSONDecodeError:
        sys.exit(0)

    session_id = input_data.get("session_id", "default")
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    if tool_name not in ["Edit", "Write", "MultiEdit"]:
        sys.exit(0)

    file_path = tool_input.get("file_path", "")
    if not file_path:
        sys.exit(0)

    content = extract_content_from_input(tool_name, tool_input)
    rule_name, reminder = check_patterns(file_path, content)

    if rule_name and reminder:
        warning_key = f"{file_path}-{rule_name}"
        shown_warnings = load_state(session_id)
        if warning_key not in shown_warnings:
            shown_warnings.add(warning_key)
            save_state(session_id, shown_warnings)
            print(reminder, file=sys.stderr)
            sys.exit(2)  # Block tool execution

    sys.exit(0)


if __name__ == "__main__":
    main()
