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

///////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////// productList /////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////

function productList_before_load() {
    return $.get('/api/products').then(function(products) {
        return { products: products };
    });
}

function productList__after_load() {
    
}

function productDetails_before_load() {
    var params = getParamsFromHash(location.hash);
    var productId = params.id;
    if (productId) {
        return $.get('/api/products/' + productId);
    } else {
        console.error('No product ID found for productDetails page');
    }
}

function productDetails__after_load() {
    // This function is called after the product details template is loaded
    // You can add any necessary logic here, such as initializing event listeners
}
