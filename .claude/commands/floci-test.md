# Floci Studio — Run UI Tests

Run Playwright end-to-end tests via the Floci Studio MCP using `run_ui_tests`.

## Arguments

`$ARGUMENTS`: optional test file path relative to the project root.

Examples:
```
/floci-test                          # run all tests
/floci-test tests/marketplace.spec.ts  # run a specific file
```

## Steps

1. Call `run_ui_tests` with `test_file` set to `$ARGUMENTS` if provided, otherwise omit it.
2. Parse the response:
   - Show a summary table: test name | status (✓ pass / ✗ fail) | duration
   - For any failures, show the full error message and stack trace in a fenced block.
   - Show overall: X passed, Y failed, total time.
3. If all tests pass, confirm with a single line summary.
4. If any fail, suggest next steps: check relevant MCP tool, inspect logs via `get_marketplace_logs`, or run `check_floci_health`.
