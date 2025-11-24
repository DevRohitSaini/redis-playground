**Project Overview**
- **Type**: Small Node.js service using ES modules (`type: "module"` in `package.json`).
- **Main responsibilities**: HTTP API (Express) backed by MongoDB (Mongoose) with Redis used as a read-cache layer for product listing endpoints.
- **Entry points**: `server.js` (app start), `redis-server.js` (Redis client wrapper), `benchmark.js` (autocannon benchmark harness).

**How to run locally**
- **Install**: `npm install` from the repo root.
- **Environment**: requires `MONGO_URI` (in `.env`) and optional `PORT`.
- **Run dev server**: `npm run dev` (uses `nodemon server.js`).
- **Run production start**: `npm start`.
- **Run benchmark**: ensure server is running, then `node benchmark.js`.

**Big-picture architecture & data flows**
- **HTTP layer**: `server.js` mounts routes under `/api` (e.g. `/api/products` comes from `routes/productRoutes.js`).
- **Persistence**: MongoDB (Mongoose models in `models/` — `Product.js`, `Note.js`).
- **Cache layer**: Redis client in `redis-server.js` is imported into routes (`productRoutes.js`) and used to short-circuit reads for list endpoints. Cache keys are generated with `generateCacheKey(req)` in `config/utills.js`.
- **Benchmarking**: `benchmark.js` targets `GET /api/products?category=Laptops` with `autocannon` and prints latency/throughput tables.

**Project-specific conventions & patterns**
- **ES modules**: use `import`/`export default`. Always preserve `.js` extensions in imports (already used in code).
- **Routes**: each route file exports an Express `router`; `server.js` wires them via `app.use('/api/products', productRoutes)`.
- **Error handling**: route handlers use `try/catch` and return JSON errors. Common patterns:
  - Success: `res.json(...)`
  - Server error: `res.status(500).json({ error: err.message })`
  - Not found: `res.status(404).json({ error: '...' })`
- **Cache key format**: `generateCacheKey` produces colon-delimited keys from `req.path` and sorted query string (example key: `api:products:category=Laptops`). Use this function if you implement or modify caching logic.

**Important implementation notes / gotchas observed**
- `server.js` calls `redisClient.connect()` at startup. Any code using Redis in routes should assume the client is connected.
- In `routes/productRoutes.js` the module imports `redisClient` but several cache calls use `client` (e.g. `await client.set(...)`, `await client.keys(...)`). Be careful: keep the import name consistent (`redisClient`) or re-export/alias properly to avoid runtime ReferenceErrors.
- Cache invalidation: product updates attempt to remove list keys using a wildcard (`client.keys('api:products*')` then `client.del(keys)`). This pattern works but is O(N) on Redis keys — acceptable for small test projects but avoid in large keyspaces. Consider using sets of related keys or Redis key namespaces with careful TTLs for production.

**Files to inspect when changing behavior**
- `server.js` — app wiring, Redis `.connect()` call, global middleware.
- `redis-server.js` — Redis client configuration (host/url, error handler).
- `config/utills.js` — cache key generation helper.
- `routes/productRoutes.js` — caching logic, query building, invalidation example.
- `config/db.js` — MongoDB connect logic (reads `process.env.MONGO_URI`).

**Suggested quick fixes / refactors (actionable examples)**
- Normalize Redis usage example: replace instances of `client` in `productRoutes.js` with the imported `redisClient`:
  - `const cachedProducts = await redisClient.get(key);`
  - `await redisClient.set(key, JSON.stringify(products));`
  - `const keys = await redisClient.keys(listCacheKey);`
- Make cache-set and invalidation consistent and resilient: always check for connection state and wrap Redis calls in `try/catch` to avoid crashing route handlers on Redis errors.

**Developer workflows & helpful commands**
- Install deps: `npm install`
- Start in dev: `npm run dev`
- Start (prod): `npm start`
- Run benchmark (server must be running): `node benchmark.js`
- To inspect Redis while running: `redis-cli -h 127.0.0.1 -p 6379` (host/port per `redis-server.js`).

**When editing code, prefer small, testable changes**
- If you change caching behavior, add console logs similar to existing `console.log('Cache hit')/('Cache miss')` so benchmark outputs show cache effects.
- Keep route responsibilities: queries -> model -> optional cache layer -> JSON response. Follow current `try/catch` error response shape.

If any of these sections are unclear or you want me to expand (for example, add a short example PR that standardizes Redis usage), tell me which part and I will iterate.
