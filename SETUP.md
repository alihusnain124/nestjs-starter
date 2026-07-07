# Project Setup & Architecture

This document describes everything that has been configured in this NestJS
template: what was added, why, and how to work with it day to day.

## Stack

- **Framework**: NestJS 11 (Express platform)
- **Database**: MySQL via TypeORM 1.0
- **Auth**: JWT (access + refresh tokens) via Passport
- **Validation**: class-validator / class-transformer
- **Docs**: Swagger / OpenAPI
- **Logging**: nestjs-pino (structured JSON logs, pretty-printed in dev)
- **Rate limiting**: @nestjs/throttler
- **Security**: helmet, CORS, bcrypt password hashing

---

## 1. Lint & Format

- `eslint.config.mjs` — flat ESLint config, `typescript-eslint` recommended +
  type-checked rules, `eslint-plugin-prettier` so formatting issues surface as
  lint errors.
- `.prettierrc` — `singleQuote`, `trailingComma: all`.

```bash
npm run lint      # eslint --fix
npm run format    # prettier --write
```

## 2. Environment & Config

- `.env.example` — template of every environment variable the app reads. Copy
  it to `.env` for local dev (already git-ignored).
- `src/config/validation.schema.ts` — a Joi schema that validates all env vars
  **at startup**. The app refuses to boot if a required var (DB creds, JWT
  secrets, etc.) is missing or malformed.
- `src/config/*.config.ts` — one `registerAs()` file per concern
  (`app`, `database`, `jwt`, `throttler`), consumed via `ConfigService.get('app.port')`
  style namespaced keys instead of raw `process.env`.
- Wired up globally in `AppModule` via `ConfigModule.forRoot({ isGlobal: true, load: [...], validationSchema })`.

| Variable | Purpose |
|---|---|
| `NODE_ENV`, `PORT`, `API_PREFIX`, `API_VERSION`, `CORS_ORIGIN` | App/runtime basics |
| `LOG_LEVEL` | pino log level |
| `THROTTLE_TTL`, `THROTTLE_LIMIT` | Rate limit window (ms) / max requests |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `DB_SYNCHRONIZE`, `DB_LOGGING` | MySQL connection |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` | Access/refresh token signing |

## 3. Database (MySQL) + TypeORM

- `src/database/database.module.ts` — runtime connection via
  `TypeOrmModule.forRootAsync`, reading from `ConfigService`. Uses
  `autoLoadEntities: true` so every `TypeOrmModule.forFeature([...])` entity is
  picked up automatically — no manual entity glob needed.
- `src/database/data-source.ts` — a separate `DataSource` used **only by the
  TypeORM CLI** (migrations), since the CLI can't resolve Nest's DI container.
- `DB_SYNCHRONIZE` should stay `false` outside of a throwaway local DB —
  schema changes go through migrations instead.

```bash
npm run migration:generate -- src/database/migrations/SomeChange   # diff entities vs DB, write a migration
npm run migration:create -- src/database/migrations/SomeChange     # write an empty migration by hand
npm run migration:run       # apply pending migrations
npm run migration:revert    # roll back the last migration
```

Setup a local database once:

```sql
CREATE DATABASE IF NOT EXISTS govt_project CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'govt_app'@'localhost' IDENTIFIED BY 'ChangeMe123!';
GRANT ALL PRIVILEGES ON govt_project.* TO 'govt_app'@'localhost';
FLUSH PRIVILEGES;
```

## 4. Common Layer (`src/common`)

Cross-cutting building blocks used across every module:

| Path | What it does |
|---|---|
| `filters/all-exceptions.filter.ts` | Global `@Catch()` filter. Normalizes **every** error (HttpException or unhandled) into one JSON shape, logs 5xx as `error` and 4xx as `warn` via pino. |
| `interceptors/response.interceptor.ts` | Global interceptor. Wraps every successful response in a consistent envelope. |
| `guards/jwt-auth.guard.ts` | Global guard. Validates the JWT bearer token on every route, unless the handler/class is marked `@Public()`. |
| `guards/roles.guard.ts` | Opt-in guard (`@UseGuards(RolesGuard)`) for role-gated routes, read via `@Roles(...)`. |
| `decorators/public.decorator.ts` | `@Public()` — marks a route to bypass the global `JwtAuthGuard`. |
| `decorators/roles.decorator.ts` | `@Roles(UserRole.ADMIN, ...)` — declares which roles may access a route (used with `RolesGuard`). |
| `decorators/current-user.decorator.ts` | `@CurrentUser()` param decorator — pulls the authenticated user off `request.user`. |
| `swagger/api-response.decorator.ts` | `@ApiSuccessResponse(Model, opts)` / `@ApiErrorResponses(...codes)` — documents the *actual* success/error envelopes (see §7) in Swagger, instead of the raw DTO shape. |

### Response envelopes

Success (`ResponseInterceptor`):

```json
{
  "statusCode": 200,
  "message": "Success.",
  "data": { "...": "..." }
}
```

A handler can override the default status/message by returning
`{ statusCode?, message?, data }` itself instead of the raw payload.
`StreamableFile` responses bypass the envelope entirely so downloads aren't
broken.

Error (`AllExceptionsFilter`):

```json
{
  "statusCode": 404,
  "message": "User with id 123 not found",
  "errors": null
}
```

### Response serialization

`User.password` is marked `@Exclude()` (class-transformer) and the column is
`select: false` in TypeORM. A global `ClassSerializerInterceptor` strips
`@Exclude()`-marked fields before `ResponseInterceptor` wraps the payload —
so the password hash can never leak in an API response, even from an entity
instance that had it loaded internally (e.g. during login).

## 5. Users Module (`src/modules/users`)

- `entities/user.entity.ts` — `id (uuid)`, `email (unique)`, `password
  (hashed, excluded from responses)`, `firstName`, `lastName`, `role (admin |
  user)`, `isActive`, timestamps.
- `users.service.ts` — CRUD + `findByEmailWithPassword` (explicit
  `addSelect('user.password')`, used only by auth) + bcrypt hashing on create.
- `users.controller.ts` — `GET /users` (admin only), `GET /users/:id`,
  `PATCH /users/:id`, `DELETE /users/:id` (admin only).

## 6. Auth Module (`src/modules/auth`)

JWT bearer auth with access + refresh tokens:

- `POST /auth/register` — public, creates a `user`-role account.
- `POST /auth/login` — public, verifies credentials with bcrypt, returns an
  access token (`JWT_EXPIRES_IN`) and a refresh token (`JWT_REFRESH_EXPIRES_IN`),
  signed with separate secrets.
- `POST /auth/refresh` — public, exchanges a valid refresh token for a new
  token pair.
- `GET /auth/profile` — protected, returns the caller's identity from the JWT.
- `strategies/jwt.strategy.ts` — validates the access token, re-checks the
  user still exists and `isActive` on every request (not just at login).

To make an endpoint admin-only: `@UseGuards(RolesGuard)` + `@Roles(UserRole.ADMIN)`
(see `users.controller.ts#findAll` for an example). To make an endpoint skip
auth entirely: `@Public()` (see `auth.controller.ts` or `AppController#getHello`).

## 7. Health Checks (`src/modules/health`)

- `GET /health` — public, powered by `@nestjs/terminus`, pings the MySQL
  connection (`TypeOrmHealthIndicator`). Point uptime monitors / k8s probes here.

## 8. `main.ts` — Process-Level Setup

In bootstrap order:

1. `bufferLogs: true` + `app.useLogger(pinoLogger)` — nothing logs before the
   real logger is attached.
2. `app.setGlobalPrefix('api')` + `app.enableVersioning({ type: URI })` — every
   route is served under `/api/v1/...`.
3. `helmet()` — sets security headers (CSP, X-Frame-Options, etc.).
4. `compression()` — gzips responses.
5. `app.enableCors(...)` — origin driven by `CORS_ORIGIN` (comma-separated list, or `*`).
6. `ValidationPipe` (global) — `whitelist`, `forbidNonWhitelisted`, `transform`,
   implicit type conversion. Any unknown/invalid field in a request body is
   rejected before it reaches a controller.
7. Swagger — served at `/api/docs`, bearer-auth scheme configured.
8. `app.enableShutdownHooks()` — lets Nest lifecycle hooks (e.g. closing the
   DB pool) run on `SIGTERM`/`SIGINT`.

## 9. App-Level Guards / Filters / Interceptors

Registered once in `AppModule` via `APP_GUARD` / `APP_FILTER` / `APP_INTERCEPTOR`,
so they apply to every route without per-controller boilerplate:

```
ThrottlerGuard          -> rate limiting (429 once THROTTLE_LIMIT is hit per THROTTLE_TTL window)
JwtAuthGuard             -> auth required by default, opt out with @Public()
AllExceptionsFilter      -> uniform error responses
ResponseInterceptor     -> uniform success envelope
ClassSerializerInterceptor -> strips @Exclude() fields (must run after ResponseInterceptor registration-wise, so it processes raw entities first)
```

## 10. Swagger

- Visit `/api/docs` once the app is running.
- `nest-cli.json` enables the `@nestjs/swagger` compiler plugin, which
  auto-generates `@ApiProperty()` metadata for any `*.dto.ts` / `*.entity.ts`
  class from its TypeScript types — no manual decoration needed on most fields.
- Use `@ApiSuccessResponse(SomeDto, { status, isArray, description })` and
  `@ApiErrorResponses(HttpStatus.BAD_REQUEST, ...)` on new controller methods
  so the documented response actually matches what the client receives
  (envelope + all, not just the bare DTO).

## 11. Known Upstream Issue

`npm audit` reports a high-severity `multer` advisory. It comes from
`@nestjs/platform-express`, which pins an exact `multer` version — this can't
be fixed from the app side without downgrading Nest itself. Revisit when
`@nestjs/platform-express` bumps its pinned version.

---

## Adding a New Feature Module — Checklist

1. `src/modules/<name>/entities/*.entity.ts` — TypeORM entity.
2. `src/modules/<name>/dto/*.dto.ts` — request/response DTOs with
   `class-validator` decorators.
3. `src/modules/<name>/<name>.service.ts` — business logic, injected repository.
4. `src/modules/<name>/<name>.controller.ts` — routes; decorate with
   `@ApiTags`, `@ApiOperation`, `@ApiSuccessResponse`/`@ApiErrorResponses`,
   `@Public()` if it should skip auth, `@Roles(...)` + `@UseGuards(RolesGuard)`
   if it's role-gated.
5. `src/modules/<name>/<name>.module.ts` — `TypeOrmModule.forFeature([Entity])`,
   wire controller/service.
6. Import the module in `AppModule`.
7. `npm run migration:generate -- src/database/migrations/Add<Name>` once the
   entity is in place, then `npm run migration:run`.
