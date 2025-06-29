window.allProducts = [];

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
    }
    return product;
}

///////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////// productList /////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////

function productList_before_load() {
    return whenDbReady().then(function() {
        // Fetch all products
        var products = queryDatabase("SELECT * FROM products");
        products.forEach(parseProduct);

        // Fetch all product-attribute relations
        var productAttributes = queryDatabase("SELECT pa.product_id, ak.key_name, a.value FROM product_attributes pa JOIN attributes a ON pa.attribute_id = a.id JOIN attribute_keys ak ON a.key_id = ak.id");

        // Attach attributes to each product
        products.forEach(function(product) {
            product.attributes = {};
            productAttributes.forEach(function(attr) {
                if (attr.product_id === product.id) {
                    if (!product.attributes[attr.key_name]) {
                        product.attributes[attr.key_name] = [];
                    }
                    product.attributes[attr.key_name].push(attr.value);
                }
            });
        });
        
        // Store all products for client-side filtering
        window.allProducts = products;

        // Fetch all available filters
        var filters = {};
        var attributeKeys = queryDatabase("SELECT * FROM attribute_keys");
        attributeKeys.forEach(function(key) {
            var attributeValues = queryDatabase("SELECT DISTINCT value FROM attributes WHERE key_id = " + key.id + " ORDER BY value");
            if (attributeValues.length > 0) {
                 filters[key.key_name] = {
                    key_id: key.id,
                    values: attributeValues.map(function(v) { return v.value; })
                };
            }
        });

        return { products: products, filters: filters };
    });
}

function productList__after_load() {
    function renderFilterPills() {
        var pillsContainer = $('#filter-pills-container');
        pillsContainer.empty();
        $('.product-filter-checkbox:checked').each(function() {
            var key = $(this).data('key');
            var value = $(this).val();
            var pillHTML = '<span class="label label-primary" style="margin-right: 5px; display: inline-block; padding: .3em .6em .3em;">' +
                           value + ' <span class="remove-pill" data-key="' + key + '" data-value="' + value + '" style="cursor: pointer; margin-left: 5px;">&times;</span>' +
                           '</span>';
            pillsContainer.append(pillHTML);
        });
    }

    function applyFilters() {
        // Get search term
        var searchTerm = $('#product-search-input').val().toLowerCase();

        // Get selected filters
        var selectedFilters = {};
        $('.product-filter-checkbox:checked').each(function() {
            var key = $(this).data('key');
            var value = $(this).val();
            if (!selectedFilters[key]) {
                selectedFilters[key] = [];
            }
            selectedFilters[key].push(value);
        });

        // Filter products
        var filteredProducts = window.allProducts.filter(function(product) {
            // Text search
            var textMatch = true;
            if (searchTerm) {
                textMatch = (product.title.toLowerCase().indexOf(searchTerm) > -1) ||
                            (product.description.toLowerCase().indexOf(searchTerm) > -1);
            }

            // Attribute filter
            var attributeMatch = true;
            for (var key in selectedFilters) {
                if (!product.attributes[key]) {
                    attributeMatch = false;
                    break;
                }
                var hasAtLeastOneValue = selectedFilters[key].some(function(v) {
                    return product.attributes[key].indexOf(v) > -1;
                });

                if (!hasAtLeastOneValue) {
                    attributeMatch = false;
                    break;
                }
            }
            
            return textMatch && attributeMatch;
        });

        // Re-render product list
        var productListContainer = $('.multi-columns-row');
        productListContainer.empty();
        
        if (filteredProducts.length > 0) {
            $("#productItemTemplate").tmpl(filteredProducts).appendTo(productListContainer);
        } else {
             productListContainer.html('<div class="col-sm-12"><p>No products match your criteria.</p></div>');
        }
        renderFilterPills();
    }

    $('#product-search-input').off('keyup').on('keyup', applyFilters);
    $('body').off('change', '.product-filter-checkbox').on('change', '.product-filter-checkbox', applyFilters);
    $('body').off('click', '.remove-pill').on('click', '.remove-pill', function() {
        var key = $(this).data('key');
        var value = $(this).data('value');
        $('.product-filter-checkbox[data-key="' + key + '"][value="' + value + '"]').prop('checked', false).trigger('change');
    });

    $('body').off('click', '#clear-all-filters').on('click', '#clear-all-filters', function() {
        console.log('Clear all filters clicked');
        $('.product-filter-checkbox:checked').prop('checked', false);
        applyFilters();
    });

    // For the accordion to work
    $('.collapse').off('shown.bs.collapse hidden.bs.collapse').on('shown.bs.collapse', function () {
        $(this).parent().find(".fa-angle-down").removeClass("fa-angle-down").addClass("fa-angle-up");
    }).on('hidden.bs.collapse', function () {
        $(this).parent().find(".fa-angle-up").removeClass("fa-angle-up").addClass("fa-angle-down");
    });
    
    // Initial render of pills
    renderFilterPills();
}

function productDetails_before_load() {
    var params = getParamsFromHash(location.hash);
    var productId = parseInt(params.id, 10);
    if (productId) {
        return whenDbReady().then(function() {
            var products = queryDatabase("SELECT * FROM products WHERE id = " + productId);
            if (products.length > 0) {
                var product = parseProduct(products[0]);
                var attributes = queryDatabase("SELECT ak.key_name, a.value FROM attributes a JOIN attribute_keys ak ON a.key_id = ak.id JOIN product_attributes pa ON a.id = pa.attribute_id WHERE pa.product_id = " + productId);
                
                product.categories = [];
                product.details = {};
                
                attributes.forEach(function(attr) {
                    if (attr.key_name === 'category') {
                        product.categories.push(attr.value);
                    } else {
                        product.details[attr.key_name] = attr.value;
                    }
                });

                return product;
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
