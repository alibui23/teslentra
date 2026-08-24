# Backend structure

The backend is organized by responsibility while keeping the existing API URLs intact.

- `server.js` starts the HTTP server.
- `app.js` configures Express and mounts the routes.
- `config/` loads environment settings and owns the database connection.
- `routes/` declares HTTP methods and paths.
- `controllers/` validates requests and coordinates API responses.
- `services/` contains reusable database-backed domain operations.
- `middleware/` contains shared Express response/error behavior.
- `utils/` contains stateless validation, normalization, and formatting helpers.

Copy `.env.example` to `.env` when configuring a new environment. 
Start the backend with `npm run server`, or use `npm run server:dev` during development.

## Nested asset endpoints

- `GET /api/assets/:assetId/sub-assets` lists direct children.
- `GET /api/assets/:assetId/used-in` lists direct parent assets.
- `GET /api/assets/:assetId/asset-tree` returns all descendants with depth.
- `POST /api/assets/:assetId/sub-assets` adds a child using `child_asset_id`.
- `DELETE /api/assets/:assetId/sub-assets/:subAssetId` removes a relationship.

The API rejects self-references, duplicate relationships, missing assets, and
relationships that would create a circular hierarchy.

## Nested part endpoints

- `GET /api/parts/:partId/part-tree` returns every nested component with its depth.
- `POST /api/parts/:partId/sub-parts` adds one component unit; selecting the same part again increments its quantity.
- `DELETE /api/parts/:partId/sub-parts/:subPartId` removes one component unit and deletes the relationship at zero.

## Dashboard endpoint

- `GET /api/dashboard` returns live inventory totals, recent activity, and checkout calendar events connected from parts, assets, purchases, checkouts, and locations.
