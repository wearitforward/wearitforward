#!/bin/bash
# This script rebuilds the SQLite database from the schema and initial data.

# Set the project root directory relative to the script location
cd "$(dirname "$0")/.."

DB_FILE="data/wif.db.sqlite"
SCHEMA_FILE="data/schema.sql"
DATA_FILE="data/initial_data.sql"

# Check if sqlite3 is installed
if ! command -v sqlite3 &> /dev/null
then
    echo "sqlite3 could not be found. Please install it to continue."
    exit 1
fi

# Remove the old database file if it exists
if [ -f "$DB_FILE" ]; then
    rm "$DB_FILE"
    echo "Removed existing database file: $DB_FILE"
fi

# Create and populate the new database
echo "Creating new database..."
sqlite3 "$DB_FILE" < "$SCHEMA_FILE"
echo "Database schema created."
sqlite3 "$DB_FILE" < "$DATA_FILE"
echo "Initial data loaded."

echo "Database setup complete: $DB_FILE"
