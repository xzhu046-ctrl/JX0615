# React Migration

0615 will move to React gradually. The rule is: keep the old static app working, migrate one app at a time, and only switch an entry after it builds and passes smoke checks.

## Order

1. Backend app: small, low risk, verifies the React build path.
2. Little Brain: important but isolated enough to migrate before chat/offline.
3. Settings and Map: shared data forms and lighter UI.
4. QQ list and Moments.
5. Chat.
6. Offline date list and offline mode.
7. Main shell.

## Rules

- Do not rewrite every app in one pass.
- Keep old storage keys and parent-shell message contracts stable.
- Use React only after the page can be built and opened locally.
- For long lists, render a visible window first and hydrate the rest in the background.
- Keep generated React output under `apps/react/` so Cloudflare Pages can deploy it as static files.
