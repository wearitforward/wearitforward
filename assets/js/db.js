const config = {
    locateFile: filename => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${filename}`
};
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

initSqlJs(config).then(function(SQL){
  const dbURL = 'wif.db.sqlite'; // Replace with your database URL!

  $.ajax({
    url: dbURL,
    mimeType: 'text/plain; charset=x-user-defined', // Important override
    responseType: 'arraybuffer'
  }).done(function(data) {
    const db = new SQL.Database(data); // No need for Uint8Array conversion anymore

    // Make the database available globally
    window.db = db;
    });
});


// function to query the database and return the results
function queryDatabase(query) {
    const results = [];
    db.each(query, function callback(row) {
        results.push(row);
    });
    return results;
}
