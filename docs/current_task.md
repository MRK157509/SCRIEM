## Current Focus

Cases have been moved from frontend localStorage to a real backend API.

### Done

- Backend now has a persistent `cases` table.
- FastAPI exposes `/cases` CRUD-style endpoints.
- Frontend `Cases`, `CaseDetail`, and `Timeline` pages now use the backend case API.
- Case notes now persist on the server.
- Timeline can create a backend case from pinned items.

### Next

- Remove or retire any leftover local-only case helper code that is no longer used.
- Add a small test/smoke path for case create, update notes, and add items.
- Consider a dedicated cases sidebar or case timeline filters if the UX needs it.
