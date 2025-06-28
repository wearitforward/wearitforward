function getParamsFromHash(hash) {
    var params = {};
    var queryString = hash.split('?')[1];
    if (queryString) {
        var pairs = queryString.split('&');
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split('=');
            params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
        }
    }
    return params;
}

function whenDbReady() {
    var deferred = $.Deferred();
    var interval = setInterval(function() {
        if (window.db) {
            clearInterval(interval);
            deferred.resolve(window.db);
        }
    }, 50);
    return deferred.promise();
}

function parseProduct(product) {
    if (product) {
        if (product.images && typeof product.images === 'string') {
            try {
                product.images = JSON.parse(product.images);
            } catch (e) {
                console.error('Failed to parse images JSON:', e);
                product.images = [];
            }
        }
        if (product.categories && typeof product.categories === 'string') {
            try {
                product.categories = JSON.parse(product.categories);
            } catch (e) {
                console.error('Failed to parse categories JSON:', e);
                product.categories = [];
            }
        }
        if (product.details && typeof product.details === 'string') {
            try {
                product.details = JSON.parse(product.details);
            } catch (e) {
                console.error('Failed to parse details JSON:', e);
                product.details = {};
            }
        }
    }
    return product;
}

///////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////// productList /////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////

function productList_before_load() {
    return whenDbReady().then(function() {
        var products = queryDatabase("SELECT * FROM products");
        products.forEach(parseProduct);
        return { products: products };
    });
}

function productList__after_load() {
    
}

function productDetails_before_load() {
    var params = getParamsFromHash(location.hash);
    var productId = parseInt(params.id, 10);
    if (productId) {
        return whenDbReady().then(function() {
            var products = queryDatabase("SELECT * FROM products WHERE id = " + productId);
            if (products.length > 0) {
                return parseProduct(products[0]);
            } else {
                console.error('Product with id ' + productId + ' not found.');
                return {};
            }
        });
    } else {
        console.error('No product ID found for productDetails page');
        return $.Deferred().reject('No product ID found for productDetails page').promise();
    }
}

function productDetails__after_load() {
    // This function is called after the product details template is loaded
    // You can add any necessary logic here, such as initializing event listeners
}
