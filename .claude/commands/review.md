Review the current changes for quality and correctness:

1. Run `git diff` to see all uncommitted changes
2. Check each changed file for:
   - Correctness: does the logic do what it should?
   - Consistency: does it follow existing patterns in the codebase?
   - Template-driven: are we hardcoding anything that should come from .cmt templates?
   - Security: no secrets, no injection vectors
   - Tests: are there tests for new behavior?
3. Run `cargo test --all` and `cd web && npm test`
4. Provide a concise review summary with any issues found
