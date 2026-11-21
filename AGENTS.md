<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Data is local-first: all records live in a browser-persisted store (`src/lib/store.ts`) seeded from `src/lib/seed.ts`; swap this module for a real backend later. Why: V1 runs without a server.
- Mutations go through `src/lib/actions.ts` so business rules (unique IDs, one active assignment, soft delete, activity log) live in one place.
- Signed-in pages live under `src/routes/_authenticated/` (client-only gate). Why: the session is stored in the browser.
