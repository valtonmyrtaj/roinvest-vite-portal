---
name: ui-polish-audit
description: Use this when the task is about premium UI polish, visual coherence, hierarchy, spacing, loading states, empty states, subtle motion, or microcopy tone without changing backend, schema, auth, or architecture.
---

# UI Polish Audit

## Goal
Improve the UI in a premium, minimal, high-end way with small, reviewable, high-confidence diffs.

## Default constraints
- preserve behavior unless a tiny UX correction is clearly justified
- no backend or schema work
- no architecture refactor
- no route/auth changes
- no random cleanup
- keep Albanian UI text
- do not start or restart the dev server
- use the existing localhost session only
- do not create a new localhost or change port
- prefer one shared system over scattered one-off tweaks
- avoid broad redesign churn
- stop before over-polishing

## What to look for
Prioritize:
1. obvious visual inconsistency
2. weak hierarchy
3. awkward spacing
4. rough loading / empty / error states
5. weak microcopy
6. noisy or cheap-feeling UI treatments
7. inconsistent headers / cards / table labels / subtitles
8. motion that feels abrupt, clumsy, or overdone

## What to avoid
- flashy motion
- bounce-heavy animation
- gradients/glows without a very strong reason
- decorative badges/pills that add noise
- oversized typography
- speculative cleanup
- “just because” design changes

## Preferred design language
- neutral surfaces
- quiet shadows
- clean borders
- controlled typography
- restrained color use
- strong spacing rhythm
- premium dashboard feel
- Apple-like restraint
- executive / financial UI discipline

## Output format
Always return:
1. top remaining polish issues ranked by impact
2. which are worth fixing now vs later
3. exact files to touch
4. only high-confidence changes
5. build/typecheck/lint results if code changes were made
6. honest verdict on whether the UI now feels more premium and coherent
7. final report in English
