# Frontend structure

- `pages/` contains one feature folder per route. Each folder exposes an
  `index.ts`, keeps the route component in `*Page.tsx`, and stores its reusable
  types, constants, and pure helpers in `*.model.ts`.
- `components/` contains shared interface components.
- `layouts/` contains shared page shells.
- `routes/` contains the application route registry.
- `config/` contains shared frontend configuration such as the API origin.
- `theme/` contains the persistent light/dark theme state.
- `styles/app.css` is the single stylesheet entry point for Tailwind CSS,
  Bootstrap, the Teslentra theme tokens, and compatibility rules for the
  existing inventory screens.

Use Bootstrap classes for standard forms, buttons, cards, tables, and layout.
Use Tailwind utilities for small responsive or spacing adjustments. Keep new
custom CSS limited to reusable Teslentra-specific components and states.

Set `VITE_API_ORIGIN` in the root `.env` file when the API is not running at
`http://localhost:5000`.

Asset hierarchy UI is isolated in
`pages/AssetDetails/AssetHierarchyCard.tsx`. It manages direct sub-assets,
parent assets, recursive descendants, and the add/remove relationship workflow.
