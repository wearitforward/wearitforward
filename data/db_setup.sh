#!/bin/bash

# This script is used to create the database, 
# create the tables, and insert the initial data.
# It is run by the Dockerfile when the container is built.
# Remove the existing database file if it exists
rm -f data.db

sqlite3 data.db "PRAGMA wal_checkpoint"
sqlite3 data.db "VACUUM"
sqlite3 data.db "PRAGMA wal_checkpoint"
sqlite3 data.db "PRAGMA optimize"

# Run the SQL script to create the schema
sqlite3 data.db < schema.sql

# Insert initial data
sqlite3 data.db < initial_data.sql

# Copy the database to the parent directory
rm ../wif.db.sqlite
cp data.db ../wif.db.sqlite