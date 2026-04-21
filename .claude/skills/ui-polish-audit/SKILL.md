# UI Polish Audit

Use this skill when the task is about improving UI polish, visual coherence, premium feel, empty states, microcopy tone, spacing, hierarchy, loading states, headers, cards, tables, or subtle motion.

Do **not** use this skill for backend work, schema changes, auth changes, architecture refactors, or broad repo cleanup.

## Goal

Improve the UI in a **premium, minimal, high-end** way with **small, reviewable, high-confidence diffs**.

The standard is:
- cleaner
- calmer
- more intentional
- more coherent
- more premium

Not:
- louder
- busier
- more decorative
- more animated for the sake of animation

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

## Default mindset

Act like a strict premium UI reviewer.

Only change things that clearly improve:
- hierarchy
- spacing
- tone
- consistency
- readability
- operator confidence
- premium feel

If the page is already good, say so.

If only 1–3 fixes are worth doing, do only those.

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

Do not introduce:
- flashy motion
- bounce-heavy animation
- gradients/glows without a very strong reason
- decorative badges/pills that add noise
- oversized typography
- broad token rewrites unless clearly necessary
- speculative cleanup
- “just because” design changes

## Preferred design language

Aim for:
- neutral surfaces
- quiet shadows
- clean borders
- controlled typography
- restrained color use
- strong spacing rhythm
- premium dashboard feel
- Apple-like restraint
- executive / financial UI discipline

## Working method

1. Audit first.
2. Rank the top issues by impact.
3. Fix only the strongest high-confidence items.
4. Keep the diff small and reviewable.
5. Validate with build/typecheck/lint if code changes were made.
6. Give an honest verdict.

## Expected output format

Always return:

1. top remaining polish issues ranked by impact
2. which are worth fixing now vs later
3. exact files to touch
4. only high-confidence changes
5. build/typecheck/lint results if code changes are made
6. honest verdict on whether the UI now feels more premium and coherent
7. final report in English

## Tone rules for copy polish

When editing UI copy:
- state first, guidance second
- be clear, calm, and confident
- avoid placeholder-sounding text
- avoid overexplaining
- keep Albanian wording natural and product-ready
- standardize terminology when it clearly improves consistency
- do not rewrite large amounts of copy unless necessary

## Finish rule

Before stopping, ask internally:

- Did this actually make the UI better?
- Is the result more coherent?
- Is the diff small enough to review comfortably?
- Did I avoid over-designing?

If the answer is not clearly yes, reduce scope.
