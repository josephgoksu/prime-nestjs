#!/bin/bash

# STDERR log function
err() {
  echo -e "\n[$(date +'%Y-%m-%dT%H:%M:%S%z')]: ${*}\n" >&2
  exit 1
}

# STDOUT log function
log() {
  echo -e "\n[$(date +'%Y-%m-%dT%H:%M:%S%z')]: ${*}\n"
}

# Check if Docker is installed
if ! type "docker" >/dev/null 2>&1; then
  err "⛔️ Docker not installed"
fi

# Check if Docker Compose is installed
if ! docker compose version >/dev/null 2>&1; then
  err "⛔️ Docker Compose not installed"
fi
log "🍀 Docker and Docker Compose are installed, everything looks good."

# Check if NodeJS is installed
if ! type "node" >/dev/null 2>&1; then
  err "⛔️ NodeJS not installed"
fi

# Check if NPM is installed
if ! type "npm" >/dev/null 2>&1; then
  err "⛔️ NPM not installed"
fi

log "↪ Copying .env.example -> .env"
cp .env.example .env
if [ $? -ne 0 ]; then
  err "⛔️ Error while copying .env"
fi

log "👐 Install dependencies"
# First install husky separately
npm install husky --save-dev
if [ $? -ne 0 ]; then
  err "⛔️ Husky installation failed"
fi

# Then run the main npm install
npm install --ignore-scripts
if [ $? -ne 0 ]; then
  err "⛔️ NPM install failed"
fi

# Initialize husky (with warning if it fails)
npx husky install
if [ $? -ne 0 ]; then
  log "⚠️ Husky initialization failed, but continuing..."
fi

log "👐 Starting Docker containers"
docker compose up -d
if [ $? -ne 0 ]; then
  err "⛔️ Docker Compose failed to start containers"
fi

# Wait for database to be ready
log "⏳ Waiting for database to be ready..."
sleep 10

log "🗃️ Running TypeORM schema sync"
npx typeorm-ts-node-commonjs schema:sync -d ./src/config/database.ts
if [ $? -ne 0 ]; then
  err "⛔️ Schema sync failed"
fi

log "🔄 Running migrations"
npx typeorm-ts-node-commonjs migration:run -d ./src/config/database.ts
if [ $? -ne 0 ]; then
  err "⛔️ Migrations failed"
fi

log "🐝 Clean repository"
rm -rf ./README.md
touch ./README.md
if [ $? -ne 0 ]; then
  err "⛔️ Cleaning failed."
fi

log "✅ Setup completed successfully!"
