# Govt Project API

A NestJS + MySQL (TypeORM) REST API with JWT auth, Swagger docs, structured
logging, rate limiting, and production security defaults already wired up.

For a deep dive into every piece (why it's there, how to extend it), see
[SETUP.md](./SETUP.md). This README covers what you need to get running.

## Stack

- **Framework**: NestJS 11 (Express)
- **Database**: MySQL, via TypeORM 1.0
- **Auth**: JWT bearer (access + refresh tokens), Passport
- **Validation**: class-validator / class-transformer
- **Docs**: Swagger / OpenAPI at `/api/docs`
- **Logging**: nestjs-pino (structured JSON, pretty-printed in dev)
- **Rate limiting**: @nestjs/throttler
- **Security**: helmet, CORS, bcrypt, global auth guard

## Prerequisites

- Node.js 22+
- A running MySQL server

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Then edit `.env` with your local MySQL credentials and JWT secrets. All
required variables are validated at startup (see `src/config/validation.schema.ts`)
— the app will refuse to boot with a clear error if something's missing.

## 3. Create the database

```sql
CREATE DATABASE IF NOT EXISTS govt_project CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'govt_app'@'localhost' IDENTIFIED BY 'ChangeMe123!';
GRANT ALL PRIVILEGES ON govt_project.* TO 'govt_app'@'localhost';
FLUSH PRIVILEGES;
```

Match these values (or your own) in `.env`. Keep `DB_SYNCHRONIZE=false` and
use migrations instead of schema auto-sync outside of a disposable local DB.

## 4. Run migrations

```bash
npm run migration:run
```

## 5. Run the app

```bash
# development (watch mode)
npm run start:dev

# production build + run
npm run build
npm run start:prod
```

The API is served under `/api/v1/...` (global prefix + URI versioning). Once
running:

- Swagger docs: `http://localhost:3000/api/docs`
- Health check: `http://localhost:3000/api/v1/health`

## What's already set up

- **Lint & format** — ESLint (flat config, typescript-eslint, type-checked
  rules) + Prettier, wired together so formatting issues fail lint.
- **Config** — `@nestjs/config`, namespaced per concern (`app`, `database`,
  `jwt`, `throttler`), validated with Joi at boot.
- **Database** — TypeORM + MySQL, `autoLoadEntities`, a separate CLI
  `DataSource` for migrations.
- **Global error handling** — every error (HTTP or unhandled) is normalized
  into one JSON shape and logged via pino.
- **Global response envelope** — every success response is wrapped
  consistently (`success`, `statusCode`, `timestamp`, `path`, `data`).
- **Auth** — JWT access/refresh tokens, a global auth guard (opt out per-route
  with `@Public()`), role-based access (`@Roles()` + `RolesGuard`), bcrypt
  password hashing, and the password hash is never serialized into a response.
- **Security middleware** — helmet, CORS, global `ValidationPipe`
  (whitelist/forbid-unknown-fields/transform), request rate limiting.
- **Swagger** — full OpenAPI docs, including accurate documented response
  envelopes (success + error shapes) per route, and auto-generated schemas
  for DTOs/entities via the swagger compiler plugin.
- **Health checks** — `/health` pings the DB connection, ready for
  uptime monitors / container orchestrators.

See [SETUP.md](./SETUP.md) for the full breakdown of each piece and a
checklist for adding new feature modules.

## Scripts

| Command | Purpose |
|---|---|
| `npm run start:dev` | Run in watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build |
| `npm run lint` | ESLint with autofix |
| `npm run format` | Prettier write |
| `npm run test` / `test:e2e` / `test:cov` | Unit / e2e / coverage tests |
| `npm run migration:generate -- <path>` | Generate a migration from entity changes |
| `npm run migration:create -- <path>` | Create an empty migration file |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:revert` | Roll back the last migration |

## License

UNLICENSED — private project.
