# React Migration

0615 will move to a SullyOS-style React structure: one Vite React tree owns the phone shell, shared state lives under `context/`, shell UI lives under `components/`, apps live under `apps/`, and storage/runtime helpers live under shared modules.

Current bridge:

- `react-src/App.tsx` is the React root for the phone shell host.
- `react-src/context/OSContext.tsx` mirrors SullyOS' OS context boundary.
- `react-src/components/PhoneShell.tsx` owns the app host chrome.
- `react-src/apps/LegacyFrameApp.tsx` keeps old HTML apps running while each app is replaced by React components.
- `react-src/constants.ts` and `react-src/types.ts` centralize app metadata and app ids.
- `react-src/offline-mode-renderer.tsx` is a temporary React renderer for the heaviest offline story list.

## Order

1. Phone shell host: `App -> OSContext -> PhoneShell -> LegacyFrameApp`.
2. Backend app and offline calendar list.
3. Little Brain: important but isolated enough to migrate before chat/offline.
4. Settings and Map: shared data forms and lighter UI.
5. QQ list and Moments.
6. Chat.
7. Offline date list internals and offline mode internals.

## Rules

- Do not rewrite every app in one pass, but every new app migration must land inside the Sully-style `apps/`, `components/`, `context/`, `utils/` structure.
- Keep old storage keys and parent-shell message contracts stable.
- Use React only after the page can be built and opened locally.
- For long lists, render a visible window first and hydrate the rest in the background.
- Keep generated React output under `apps/react/` so Cloudflare Pages can deploy it as static files.
