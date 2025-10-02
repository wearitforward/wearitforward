window.allProducts = [];

///////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////// Database Management ////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////

// Global database refresh handler
window.onDatabaseRefresh = function() {
    console.log('Database refreshed, updating product data...');

    // Show refresh indicator
    showDatabaseRefreshIndicator();

    // Reload products if we're on product-related pages
    if (window.getFragment) {
        const currentFragment = window.getFragment();
        if (currentFragment === 'productList') {
            // Reload product list
            productList_before_load().then(() => {
                // Re-render the template with fresh data
                const templateData = productList_before_load();
                if (templateData && typeof templateData.then === 'function') {
                    templateData.then(function(resolvedData) {
                        $("#t-body").empty();
                        $("#sectionTemplate").tmpl(resolvedData || {}).appendTo("#t-body");
                        productList_after_load();
                    });
                }
            });
        }
    }

    // Hide refresh indicator after a short delay
    setTimeout(hideDatabaseRefreshIndicator, 2000);
};

function showDatabaseRefreshIndicator() {
    $('#db-refresh-indicator').show();
}

function hideDatabaseRefreshIndicator() {
    $('#db-refresh-indicator').hide();
}

function manualDatabaseRefresh() {
    console.log('Manual database refresh triggered by user');
    showDatabaseRefreshIndicator();

    if (window.refreshDatabase) {
        window.refreshDatabase().then(() => {
            console.log('Manual refresh completed');
            setTimeout(hideDatabaseRefreshIndicator, 2000);
        }).catch((error) => {
            console.error('Manual refresh failed:', error);
            setTimeout(hideDatabaseRefreshIndicator, 1000);
        });
    } else {
        console.warn('Database refresh function not available');
        setTimeout(hideDatabaseRefreshIndicator, 1000);
    }
}

// Make manual refresh globally available
window.manualDatabaseRefresh = manualDatabaseRefresh;

// Check database freshness on page visibility
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // Page became visible, check if we need to refresh
        console.log('Page became visible, checking database freshness...');
        if (window.refreshDatabase && typeof window.shouldRefreshDatabase === 'function') {
            // This will be available once db.js loads
            setTimeout(() => {
                if (window.shouldRefreshDatabase && window.shouldRefreshDatabase()) {
                    console.log('Database is stale, refreshing...');
                    showDatabaseRefreshIndicator();
                    window.refreshDatabase().then(() => {
                        setTimeout(hideDatabaseRefreshIndicator, 2000);
                    });
                }
            }, 1000);
        }
    }
});

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
        // Fetch all products ordered by display_order
        var products = queryDatabase("SELECT * FROM products ORDER BY display_order ASC");
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

function cart_before_load() {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let total = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;
    });

    return { items: cart, total: total };
}

function cart_after_load() {
    // Handle removing an item from the cart
    $('body').off('click', '.remove-from-cart').on('click', '.remove-from-cart', function(e) {
        e.preventDefault();
        const productId = parseInt($(this).data('id'), 10);
        removeFromCart(productId);
        loadBodyContent(); // Reload cart view to reflect removal and new total
    });

    // Handle updating cart quantities
    $('body').off('click', '#update-cart').on('click', '#update-cart', function(e) {
        e.preventDefault();
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        let cartUpdated = false;

        // Find all quantity inputs and update the cart array
        $('tbody input[type="number"]').each(function() {
            const productId = parseInt($(this).data('id'), 10);
            const newQuantity = parseInt($(this).val(), 10);

            const itemInCart = cart.find(item => item.id === productId);

            if (itemInCart && newQuantity > 0 && itemInCart.quantity !== newQuantity) {
                itemInCart.quantity = newQuantity;
                cartUpdated = true;
            }
        });

        if (cartUpdated) {
            updateCart(cart);
            loadBodyContent(); // Reload cart view to reflect new quantities and total
        }
    });
}

function checkout_before_load() {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let total = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;
    });

    return { items: cart, total: total };
}

function checkout_after_load() {
    // Handle form submission
    $('body').off('submit', '#checkout-form').on('submit', '#checkout-form', function(e) {
        e.preventDefault();

        // Get cart data for PostHog
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        let total = 0;
        cart.forEach(item => {
            total += item.price * item.quantity;
        });

        // PostHog event for starting checkout
        posthog.capture('checkout_started', {
            cart: cart,
            total: total
        });

        // Get form data
        const name = $('#customer-name').val().trim();
        const email = $('#customer-email').val().trim();
        const phone = $('#customer-phone').val().trim();
        const address = $('#customer-address').val().trim();
        const instructions = $('#special-instructions').val().trim();

        // Validate required fields
        if (!name || !email || !phone || !address) {
            alert('Please fill in all required fields.');
            return;
        }

        // Get cart data
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        let total = 0;
        cart.forEach(item => {
            total += item.price * item.quantity;
        });

        // Build order summary for email
        let orderSummary = 'ORDER DETAILS:\n';
        orderSummary += '================\n\n';

        cart.forEach(item => {
            orderSummary += `${item.title}\n`;
            orderSummary += `  Price: $${item.price.toFixed(2)}\n`;
            orderSummary += `  Quantity: ${item.quantity}\n`;
            orderSummary += `  Subtotal: $${(item.price * item.quantity).toFixed(2)}\n\n`;
        });

        orderSummary += `TOTAL: $${total.toFixed(2)}\n\n`;
        orderSummary += 'CUSTOMER INFORMATION:\n';
        orderSummary += '=====================\n';
        orderSummary += `Name: ${name}\n`;
        orderSummary += `Email: ${email}\n`;
        orderSummary += `Phone: ${phone}\n`;
        orderSummary += `Pickup Address: ${address}\n`;

        if (instructions) {
            orderSummary += `Special Instructions: ${instructions}\n`;
        }

        orderSummary += '\nPlease contact me to arrange pickup and payment. Thank you!';

        // Create email content
        const subject = `New Order from ${name} - $${total.toFixed(2)}`;
        const body = encodeURIComponent(orderSummary);
        const mailtoLink = `mailto:wearitforward.org@gmail.com?subject=${encodeURIComponent(subject)}&body=${body}`;

        // Populate modal with email content
        $('#email-subject').text(subject);
        $('#email-body').text(orderSummary);
        $('#mailto-link').attr('href', mailtoLink);

        // Show custom modal
        $('#email-modal').css('display', 'block');

        // Clear cart after showing modal
        localStorage.removeItem('cart');
        updateCartIcon();
    });

    // Handle copy buttons
    $('body').off('click', '.copy-btn').on('click', '.copy-btn', function(e) {
        e.preventDefault();
        const targetId = $(this).data('target');
        const targetElement = document.getElementById(targetId);
        const textToCopy = targetElement.textContent || targetElement.innerText;

        // Create a temporary textarea element to copy text
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = textToCopy;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        tempTextarea.setSelectionRange(0, 99999); // For mobile devices

        try {
            document.execCommand('copy');
            // Show success feedback
            const originalText = $(this).html();
            $(this).html('<i class="fa fa-check"></i> Copied!');
            $(this).css('background-color', '#27ae60');

            setTimeout(() => {
                $(this).html(originalText);
                $(this).css('background-color', '#3498db');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy. Please select and copy manually.');
        }

        document.body.removeChild(tempTextarea);
    });

    // Handle modal close buttons
    $('body').off('click', '#close-modal, #close-modal-btn').on('click', '#close-modal, #close-modal-btn', function(e) {
        e.preventDefault();
        $('#email-modal').css('display', 'none');
        window.location.hash = '#landing';
    });

    // Handle modal backdrop click (close when clicking outside)
    $('body').off('click', '#email-modal').on('click', '#email-modal', function(e) {
        if (e.target === this) {
            $('#email-modal').css('display', 'none');
            window.location.hash = '#landing';
        }
    });

    // Prevent modal content clicks from closing modal
    $('body').off('click', '#email-modal > div > div').on('click', '#email-modal > div > div', function(e) {
        e.stopPropagation();
    });
}

function donate_after_load() {
    // Handle donation email button
    $('body').off('click', '#send-donation-email').on('click', '#send-donation-email', function(e) {
        e.preventDefault();
        // Show donation modal
        $('#donation-email-modal').css('display', 'block');

        // PostHog event for initiating a donation
        posthog.capture('donation_initiated');
    });

    // Handle donation modal close buttons
    $('body').off('click', '#close-donation-modal, #close-donation-modal-btn').on('click', '#close-donation-modal, #close-donation-modal-btn', function(e) {
        e.preventDefault();
        $('#donation-email-modal').css('display', 'none');
    });

    // Handle donation modal backdrop click (close when clicking outside)
    $('body').off('click', '#donation-email-modal').on('click', '#donation-email-modal', function(e) {
        if (e.target === this) {
            $('#donation-email-modal').css('display', 'none');
        }
    });

    // Prevent donation modal content clicks from closing modal
    $('body').off('click', '#donation-email-modal > div > div').on('click', '#donation-email-modal > div > div', function(e) {
        e.stopPropagation();
    });

    // Handle copy buttons for donation modal (reuse existing copy functionality)
    // The copy functionality is already handled by the existing .copy-btn handler above
}

///////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////// Add to Cart Feedback /////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////

function addToCartWithFeedback(productId, item) {
    // Call the original addToCart function
    addToCart(item);

    // PostHog event for adding to cart
    posthog.capture('add_to_cart', {
        product_id: item.id,
        product_name: item.title,
        price: item.price,
        quantity: item.quantity
    });

    // Get the button and feedback elements
    const button = document.getElementById('add-to-cart-btn-' + productId);
    const feedback = document.getElementById('cart-feedback-' + productId);

    if (button && feedback) {
        // Change button text temporarily
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fa fa-check" style="margin-right: 8px;"></i>Added!';
        button.style.backgroundColor = '#27ae60';
        button.style.borderColor = '#27ae60';

        // Show feedback section
        feedback.style.display = 'block';

        // Reset button after 3 seconds
        setTimeout(function() {
            button.innerHTML = originalText;
            button.style.backgroundColor = '';
            button.style.borderColor = '';
        }, 3000);

        // Auto-hide feedback after 10 seconds
        setTimeout(function() {
            feedback.style.display = 'none';
        }, 10000);
    }
}
