cd data/pb_data

sqlite3 data.db "PRAGMA wal_checkpoint"
sqlite3 data.db "VACUUM"
sqlite3 data.db "PRAGMA wal_checkpoint"
sqlite3 data.db "PRAGMA optimize"

rm ../../wif.db.sqlite
cp data.db ../../wif.db.sqlite