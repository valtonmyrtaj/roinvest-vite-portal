# Freeze Audit

Use this skill when the task is about deciding whether a chapter, slice, or worktree is ready to freeze, review, or commit.

Do **not** use this skill for feature work, visual ideation, or broad repo cleanup unless the purpose is explicitly to evaluate freeze readiness.

## Goal

Act like a strict release/review gate.

The job is to decide whether a slice is:
- freeze-worthy
- freeze-worthy with caveats
- audit-only
- not ready

Do not rubber-stamp work.
Do not invent extra scope.
Do not add new polish just to make the report look useful.

## Default constraints

- prove issues before changing anything
- prefer audit and diagnosis over unnecessary edits
- no random cleanup
- no broad refactor
- no redesign
- no backend/schema changes unless the freeze issue directly requires it
- preserve existing behavior unless a bug fix is clearly justified
- keep Albanian UI text
- do not start or restart the dev server
- use the existing localhost session only
- do not create a new localhost or change port
- keep any fix extremely small and reviewable

## Default mindset

Act like:
- a strict technical reviewer
- a release gate
- a senior engineer checking whether a chapter is actually coherent

Ask internally:
- Is the problem real?
- Is the fix isolated?
- Is the worktree understandable?
- Are there hidden regressions?
- Is this actually ready to freeze, or just “probably okay”?

## What to audit

Prioritize:
1. exact runtime/codepath correctness
2. user-visible regressions
3. stale state / race conditions
4. chained-write / partial-success risk
5. auth/bootstrap correctness
6. packaging/reviewability of the worktree
7. whether the diff is too noisy for a clean freeze
8. whether the chapter has a clear boundary

## What to avoid

Do not:
- keep polishing once the slice is already good enough
- broaden scope into unrelated systems
- add speculative “nice improvements”
- confuse cleanup with freeze-readiness
- treat passing build/lint/typecheck alone as proof of quality

## Working method

1. Audit first.
2. Identify the single strongest freeze risk, or confirm there isn’t one.
3. Fix only proven, high-value regressions if the fix is small.
4. Run validation.
5. Give an honest verdict.

## Expected output format

Always return:

1. exact files audited
2. exact files changed, if any
3. the single highest-value issue found, or confirmation that no change was justified
4. exact codepath/runtime proof
5. user-visible impact
6. what was changed and why, or why no change was justified
7. what stayed intentionally unchanged
8. validation results
9. remaining risks / caveats
10. honest verdict:
   - freeze-worthy
   - freeze-worthy with caveats
   - audit-only
   - not ready
11. final report in English

## Validation rule

When code changes are made, try to validate with:
- build
- typecheck
- lint

When packaging/reviewability is the issue, also inspect:
- `git status --short`
- `git diff --stat`

## Finish rule

Before stopping, ask internally:

- Did I actually prove the chapter is safe?
- Did I avoid unnecessary changes?
- Is the verdict honest?
- Would I personally be comfortable freezing this?
