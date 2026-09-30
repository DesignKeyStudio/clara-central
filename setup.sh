#!/usr/bin/env bash
#
# First-run setup for Clara Central.
#
#   ./setup.sh          # install deps, scaffold env files, generate the Prisma client
#
# Idempotent: existing env files are never overwritten. It deliberately stops
# short of touching your database — run the migrate/seed steps yourself once the
# Supabase credentials are filled in, so nothing is applied to the wrong project.

set -euo pipefail

info() { printf '\033[1;36m›\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$1"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$1"; }

# ── Prerequisites ──

if ! command -v node >/dev/null 2>&1; then
  warn "Node.js not found. Install Node 20 or newer, then re-run ./setup.sh"
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  warn "Node $(node -v) detected; this project needs Node 20 or newer."
  exit 1
fi
ok "Node $(node -v)"

if ! command -v pnpm >/dev/null 2>&1; then
  warn "pnpm not found. Enable it with:  corepack enable pnpm"
  warn "(this project pins its package manager in package.json)"
  exit 1
fi
ok "pnpm $(pnpm --version)"

# ── Dependencies ──

info "Installing dependencies…"
pnpm install
ok "Dependencies installed"

# ── Environment files ──
#
# Runtime config is read from .env.local; Prisma CLI commands read prisma/.env.
# Both are gitignored.

if [ -f .env.local ]; then
  ok ".env.local already exists — left untouched"
else
  cp .env.example .env.local
  ok "Created .env.local from .env.example"
  NEEDS_ENV=1
fi

if [ -f prisma/.env ]; then
  ok "prisma/.env already exists — left untouched"
else
  {
    echo '# Prisma CLI reads this file for migrate/studio/db commands.'
    echo '# Copy DATABASE_URL and DIRECT_URL from your .env.local.'
    echo 'DATABASE_URL=""'
    echo 'DIRECT_URL=""'
  } > prisma/.env
  ok "Created prisma/.env"
  NEEDS_ENV=1
fi

# ── Prisma client ──

info "Generating the Prisma client…"
pnpm exec prisma generate >/dev/null
ok "Prisma client generated"

# ── What's left ──

echo
if [ "${NEEDS_ENV:-0}" = "1" ]; then
  warn "Next: fill in your Supabase values in .env.local and prisma/.env"
  echo "      Create a project at https://supabase.com, then copy:"
  echo "        • DATABASE_URL / DIRECT_URL  (Project settings → Database)"
  echo "        • NEXT_PUBLIC_SUPABASE_URL and the API keys (Project settings → API)"
  echo
fi
echo "Then apply the schema and start the app:"
echo "    pnpm exec prisma migrate dev     # create + apply migrations"
echo "    pnpm exec prisma db seed         # demo org + admin user"
echo "    pnpm dev                         # http://localhost:3003"
echo
