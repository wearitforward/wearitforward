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

function productList_after_load() {
    let currentPage = 1;
    const productsPerPage = 8;
    let currentFilteredProducts = [];

    function renderFilterPills() {
        var pillsContainer = $('#filter-pills-container');
        pillsContainer.empty();
        $('.product-filter-checkbox:checked').each(function() {
            var key = $(this).data('key');
            var value = $(this).val();
            var pillHTML = '<span class="label label-primary" style="margin-right: 5px; display: inline-block; padding: 0.5em 0.8em; font-size: 14px;">' +
                           value + ' <span class="remove-pill" data-key="' + key + '" data-value="' + value + '" style="cursor: pointer; margin-left: 5px;">&times;</span>' +
                           '</span>';
            pillsContainer.append(pillHTML);
        });
    }

    function renderPagination() {
        const paginationContainer = $('.pagination');
        paginationContainer.empty();
        const pageCount = Math.ceil(currentFilteredProducts.length / productsPerPage);

        if (pageCount <= 1) {
            return;
        }

        const prevPage = currentPage > 1 ? currentPage - 1 : 1;
        paginationContainer.append(`<a href="#" class="page-link" data-page="${prevPage}"><i class="fa fa-angle-left"></i></a>`);

        for (let i = 1; i <= pageCount; i++) {
            const activeClass = (i === currentPage) ? 'active' : '';
            paginationContainer.append(`<a href="#" class="page-link ${activeClass}" data-page="${i}">${i}</a>`);
        }

        const nextPage = currentPage < pageCount ? currentPage + 1 : pageCount;
        paginationContainer.append(`<a href="#" class="page-link" data-page="${nextPage}"><i class="fa fa-angle-right"></i></a>`);
    }

    function renderProducts() {
        const start = (currentPage - 1) * productsPerPage;
        const end = start + productsPerPage;
        const paginatedProducts = currentFilteredProducts.slice(start, end);

        var productListContainer = $('.multi-columns-row');
        productListContainer.empty();

        if (paginatedProducts.length > 0) {
            $("#productItemTemplate").tmpl(paginatedProducts).appendTo(productListContainer);
        } else {
             productListContainer.html('<div class="col-sm-12"><p>No products match your criteria.</p></div>');
        }
    }

    function applyFilters() {
        var searchTerm = $('#product-search-input').val().toLowerCase();
        localStorage.setItem('productSearchTerm', searchTerm);

        var selectedFilters = {};
        $('.product-filter-checkbox:checked').each(function() {
            var key = $(this).data('key');
            var value = $(this).val();
            if (!selectedFilters[key]) {
                selectedFilters[key] = [];
            }
            selectedFilters[key].push(value);
        });
        localStorage.setItem('productSelectedFilters', JSON.stringify(selectedFilters));

        currentFilteredProducts = window.allProducts.filter(function(product) {
            var textMatch = true;
            if (searchTerm) {
                textMatch = (product.title.toLowerCase().indexOf(searchTerm) > -1) ||
                            (product.description.toLowerCase().indexOf(searchTerm) > -1);
            }

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

        renderProducts();
        renderPagination();
        renderFilterPills();
    }

    $('#product-search-input').off('keyup').on('keyup', function() {
        currentPage = 1;
        localStorage.setItem('productListPage', '1');
        applyFilters();
    });

    $('body').off('change', '.product-filter-checkbox').on('change', '.product-filter-checkbox', function() {
        currentPage = 1;
        localStorage.setItem('productListPage', '1');
        applyFilters();
    });

    $('body').off('click', '.remove-pill').on('click', '.remove-pill', function() {
        var key = $(this).data('key');
        var value = $(this).data('value');
        $('.product-filter-checkbox[data-key="' + key + '"][value="' + value + '"]').prop('checked', false);
        currentPage = 1;
        localStorage.setItem('productListPage', '1');
        applyFilters();
    });

    $('#filter-modal').off('click', '#clear-all-filters').on('click', '#clear-all-filters', function() {
        $('.product-filter-checkbox:checked').prop('checked', false);
        $('#product-search-input').val('');
        currentPage = 1;
        localStorage.setItem('productListPage', '1');
        applyFilters();
    });

    $('body').off('click', '.page-link').on('click', '.page-link', function(e) {
        e.preventDefault();
        currentPage = parseInt($(this).data('page'));
        localStorage.setItem('productListPage', currentPage);
        applyFilters();
    });

    $('.collapse').off('shown.bs.collapse hidden.bs.collapse').on('shown.bs.collapse', function () {
        $(this).parent().find(".fa-angle-down").removeClass("fa-angle-down").addClass("fa-angle-up");
    }).on('hidden.bs.collapse', function () {
        $(this).parent().find(".fa-angle-up").removeClass("fa-angle-up").addClass("fa-angle-down");
    });

    function loadState() {
        var savedPage = localStorage.getItem('productListPage');
        if (savedPage) {
            currentPage = parseInt(savedPage, 10);
        }

        var savedSearchTerm = localStorage.getItem('productSearchTerm');
        if (savedSearchTerm) {
            $('#product-search-input').val(savedSearchTerm);
        }

        var savedFiltersJSON = localStorage.getItem('productSelectedFilters');
        if (savedFiltersJSON) {
            try {
                var savedFilters = JSON.parse(savedFiltersJSON);
                $('.product-filter-checkbox').prop('checked', false); // First clear all
                for (var key in savedFilters) {
                    savedFilters[key].forEach(function(value) {
                        $('.product-filter-checkbox[data-key="' + key + '"][value="' + value + '"]').prop('checked', true);
                    });
                }
            } catch (e) {
                console.error('Error parsing saved filters from localStorage:', e);
            }
        }
    }
    
    // Initial call
    loadState();
    applyFilters();
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

function productDetails_after_load() {
    // This function is called after the product details template is loaded
    // You can add any necessary logic here, such as initializing event listeners
}
