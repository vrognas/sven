- In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.
- Do not write any code until you're fully ready to implement it.
- It's IMPORTANT for each implementation to begin with writing and reviewing tests BEFORE moving on to implementation (TDD test-driven development).
  Write minimalist tests. Don't overdo it - about three general end-to-end tests per implementation is enough.
- Before writing tests, write a concise implementation plan with numbered steps.
- At the end of each plan, give me a list of unresolved questions to answer, if any.
  Make the questions extremely concise.
  Sacrifice grammar for the sake of concision.
- After implementation, run all tests to ensure nothing is broken.
- After implementation, write concise documentation updates if necessary.
- After implementation, write a concise changelog entry summarizing the changes made.
- After implementation, update the version number according to semantic versioning rules.
- Follow all steps in the implementation plan methodically.
- After implementation, review the entire codebase for any necessary refactoring or cleanup.
- Before each implementation, review `docs/LESSONS_LEARNED.md` for any relevant insights.
- Before each implementation, review `docs/ARCHITECTURE_ANALYSIS.md` for any relevant architectural considerations.
- Before each implementation, review `CLAUDE.md` for any relevant guidelines.
- After each implementation, review `docs/LESSONS_LEARNED.md` to add any new insights gained.
- After each implementation, review `docs/ARCHITECTURE_ANALYSIS.md` to update any architectural considerations.
- After each implementation, review `CLAUDE.md` to update any relevant guidelines.
- Always prioritize code quality and maintainability.
- Commit often, with small and focused commits.
- Write concise commit messages that clearly describe the changes made.
- For simple queries, use under five tool calls, but for more complex queries you can use up to 15 tool calls.

## Agent-Specific Instructions

- For repo-wide search, use `rg` (ripgrep) and `fd/fdfind`; avoid `grep/find`.
- Cap file reads at ~250 lines; prefer `rg -n -A3 -B3` for context.
- Use `jq` for JSON parsing.
- Fast-tools prompt: copy the block in `cdx/prompts/setup-fast-tools.md` if it is missing from this file.

## CRITICAL: Use ripgrep, not grep

NEVER use grep for project-wide searches (slow, ignores .gitignore). ALWAYS use rg.

- `rg "pattern"` — search content
- `rg --files | rg "name"` — find files
- `rg -t python "def"` — language filters

## File finding

- Prefer `fd` (or `fdfind` on Debian/Ubuntu). Respects .gitignore.

## JSON

- Use `jq` for parsing and transformations.

## Agent Instructions

- Replace commands: grep→rg, find→rg --files/fd, ls -R→rg --files, cat|grep→rg pattern file
- Cap reads at 250 lines; prefer `rg -n -A 3 -B 3` for context
- Use `jq` for JSON instead of regex
