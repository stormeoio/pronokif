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
Translations are scoped to the public/front-end application UI only. League content and user-generated data must stay in the language entered by users, and the admin back office must remain fully French.

Default expectation:
- Translate UI labels, navigation, empty states, helper text, system buttons, validation messages, and front-end interface copy through the front-end i18n resources.
- Do not translate or include in completion metrics: league names/descriptions, predictions, custom predictions, chats/messages, player names, usernames, scores, feedback, support discussions, uploaded media metadata, or any user-generated content.
- Keep canonical IDs and enum-like technical values language-neutral, but do not add translation tables/fields for user-owned content unless the user explicitly reopens that scope.
- Keep all admin back-office screens, actions, labels, logs, and operational copy in French.
