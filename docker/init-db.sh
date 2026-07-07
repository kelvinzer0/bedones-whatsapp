#!/bin/bash
# Initialize 2 databases in a single PostgreSQL instance
# Used by docker-compose.prod.yml for standalone deployment
set -e
set -u

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE app_db;
    CREATE DATABASE agent_db;
    GRANT ALL PRIVILEGES ON DATABASE app_db TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE agent_db TO $POSTGRES_USER;
EOSQL

echo "Initialized databases: app_db (for backend), agent_db (for whatsapp-agent)"
