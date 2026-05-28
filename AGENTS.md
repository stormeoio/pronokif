# Pronokif (F1 Paddock Predictor)

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Internationalization
Pronokif.eu is being prepared for a multilingual version.
Every new database table, seed dataset, enum-like content list, admin-managed content field, notification template, email template, public copy source, or user-visible stored data must anticipate future translations.

Default expectation:
- Keep stable language-neutral identifiers separate from translated labels/copy.
- Avoid hard-coding French-only content in schemas or seed data when that content may be shown to users.
- Prefer structures that can later hold per-locale values, such as translation tables, locale-keyed JSON, or i18n keys, according to the surrounding backend pattern.
- When adding migrations or data imports, document which fields are translatable and which are canonical/internal.
