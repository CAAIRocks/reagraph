<!-- B2EMO:START -->
# bee CLI Integration

This project uses bee for AI agent orchestration and spec-driven development workflows.

## OpenSpec CLI (IMPORTANT)

**Always use `bee openspec` instead of bare `openspec` commands.** The `bee openspec` proxy uses a vendored, version-pinned openspec CLI and provides additional features (sorted list output, spec auditing). Examples:

```bash
bee openspec list              # NOT: openspec list
bee openspec list --json       # Structured output for automation
bee openspec validate --strict # NOT: openspec validate --strict
bee openspec archive <id>      # NOT: openspec archive <id>
bee openspec audit             # bee-only command (not in upstream openspec)
```

For agent commands, use OPSX-prefixed commands like `/opsx-apply` and `/opsx-archive`.

## bee exec (Command Output Streaming)

When running verification commands (tests, linters, builds), prefix with `bee exec --` to stream output to the TUI:

```bash
bee exec -- pytest tests/ -v
bee exec -- make check
bee exec -- uv run ruff check src/
bee exec -- mypy src/
```

**When to use:** Long-running commands where live visibility in the TUI helps track progress.

**Fallback behavior:** If bee isn't running (no active session) or `--no-stream` is passed, the command executes normally without streaming.

For compound commands with `&&`, wrap in bash:
```bash
bee exec -- bash -c "cd subdir && pytest"
```

This section is managed by bee. Run `bee setup` to update it.
<!-- B2EMO:END -->
