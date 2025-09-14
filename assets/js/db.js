const config = {
    locateFile: filename => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${filename}`
};

// Database cache management
const DB_CACHE_KEY = 'wif_db_timestamp';
const DB_CACHE_DURATION = 3 * 60 * 1000; // 3 minutes in milliseconds (reduced for more frequent updates)
const DB_PERIODIC_REFRESH = 5 * 60 * 1000; // 5 minutes in milliseconds (reduced for more frequent updates)

// Log cache configuration
console.log('Database cache configuration:', {
    cacheDuration: `${DB_CACHE_DURATION / 1000 / 60} minutes`,
    periodicRefresh: `${DB_PERIODIC_REFRESH / 1000 / 60} minutes`
});

$.ajaxSetup({
    contents: {
        binary: /sqlite3/
    },
    converters: {
        "text binary": function(data){
            var byteArray = [];
            for(var i = 0; i < data.length; i++){
                byteArray.push(data.charCodeAt(i) & 0xff);
            }
            return new Uint8Array(byteArray);
        }
    }
});

function shouldRefreshDatabase() {
    const lastLoaded = localStorage.getItem(DB_CACHE_KEY);
    if (!lastLoaded) {
        console.log('No previous database load timestamp found, refresh needed');
        return true;
    }

    const timeSinceLastLoad = Date.now() - parseInt(lastLoaded);
    const shouldRefresh = timeSinceLastLoad > DB_CACHE_DURATION;

    console.log('Database cache check:', {
        lastLoaded: new Date(parseInt(lastLoaded)).toLocaleTimeString(),
        timeSinceLastLoad: `${Math.round(timeSinceLastLoad / 1000 / 60 * 10) / 10} minutes ago`,
        shouldRefresh: shouldRefresh
    });

    return shouldRefresh;
}

function generateCacheBuster() {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function loadDatabase(forceRefresh = false) {
    return new Promise((resolve, reject) => {
        initSqlJs(config).then(function(SQL){
            const baseURL = 'data/wif.db.sqlite';

            // Add cache busting parameters if refresh is needed or forced
            let dbURL = baseURL;
            if (forceRefresh || shouldRefreshDatabase()) {
                const cacheBuster = generateCacheBuster();
                dbURL = `${baseURL}?v=${cacheBuster}`;
                console.log('Loading fresh database with cache buster:', cacheBuster);
            } else {
                console.log('Using potentially cached database');
            }

            $.ajax({
                url: dbURL,
                mimeType: 'text/plain; charset=x-user-defined',
                responseType: 'arraybuffer',
                cache: false, // Disable jQuery cache
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            }).done(function(data) {
                try {
                    const db = new SQL.Database(data);

                    // Make the database available globally
                    window.db = db;

                    // Update cache timestamp
                    localStorage.setItem(DB_CACHE_KEY, Date.now().toString());

                    console.log('Database loaded successfully at:', new Date().toLocaleTimeString());
                    resolve(db);
                } catch (error) {
                    console.error('Error creating database:', error);
                    reject(error);
                }
            }).fail(function(xhr, status, error) {
                console.error('Failed to load database:', status, error);
                reject(new Error(`Failed to load database: ${status} - ${error}`));
            });
        }).catch(reject);
    });
}

// Global promise for database readiness
let dbReadyPromise = loadDatabase();

// Periodic database refresh
let refreshInterval;

function startPeriodicRefresh() {
    // Clear existing interval if any
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    refreshInterval = setInterval(() => {
        console.log('Performing periodic database refresh...');
        dbReadyPromise = loadDatabase(true); // Force refresh

        // Notify any listeners about the refresh
        if (window.onDatabaseRefresh && typeof window.onDatabaseRefresh === 'function') {
            dbReadyPromise.then(() => {
                window.onDatabaseRefresh();
            });
        }
    }, DB_PERIODIC_REFRESH);
}

// Start periodic refresh
startPeriodicRefresh();

// Updated function to get database ready promise
function whenDbReady() {
    return dbReadyPromise;
}

// Function to manually refresh database
function refreshDatabase() {
    console.log('Manual database refresh requested');
    dbReadyPromise = loadDatabase(true);
    return dbReadyPromise;
}

// Make functions globally available
window.refreshDatabase = refreshDatabase;
window.shouldRefreshDatabase = shouldRefreshDatabase;

// function to query the database and return the results
function queryDatabase(query) {
    if (!window.db) {
        console.error('Database not ready. Use whenDbReady() first.');
        return [];
    }

    const results = [];
    try {
        window.db.each(query, function callback(row) {
            results.push(row);
        });
    } catch (error) {
        console.error('Database query error:', error);
        return [];
    }
    return results;
}

// Enhanced query function that waits for DB to be ready
function queryDatabaseAsync(query) {
    return whenDbReady().then(() => {
        return queryDatabase(query);
    });
}
