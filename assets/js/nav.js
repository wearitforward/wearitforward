const navDataMap = {
    "landing": {
        title: "Home",
        template: "landingTemplate.html",
        link: "index.html#landing",
        isMenu: true,
    },
    "productList": {
        title: "Shop",
        template: "productListTemplate.html",
        link: "index.html#productList",
        isMenu: true,
    },
    "productDetails": {
        title: "Product Details",
        template: "productDetailsTemplate.html",
        link: "index.html#productDetails",
        isMenu: false,
    },
    "cart": {
        title: "Cart",
        template: "cartTemplate.html",
        link: "index.html#cart",
        isMenu: false,
    },
    "checkout": {
        title: "Checkout",
        template: "checkoutTemplate.html",
        link: "index.html#checkout",
        isMenu: false,
    },
    "donate": {
        title: "Donate",
        template: "donateTemplate.html",
        link: "index.html#donate",
        isMenu: true,
    },
    "faq": {
        title: "FAQ",
        template: "faqTemplate.html",
        link: "index.html#faq",
        isMenu: true,
    },
    "howItWorks": {
        title: "How it works",
        template: "howItWorksTemplate.html",
        link: "index.html#howItWorks",
        isMenu: false,
    },
    "blog": {
        title: "Blog",
        link: "https://blog.wearitforward.org",
        isMenu: false,
    },
    "aboutUs": {
        title: "About Us",
        template: "aboutUsTemplate.html",
        link: "index.html#aboutUs",
        isMenu: false,
    },
}

// Generate the navData array from the navDataMap
const navData = [];
for (var key in navDataMap) {
    
    if (navDataMap[key].isMenu) {
        navData.push({
            name: key,
            title: navDataMap[key].title,
            link: navDataMap[key].link,
            template: navDataMap[key].template,
        });
    }
}

function addToCart(item) {
    console.log('Adding item to cart:', item);
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);

    if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity += item.quantity;
    } else {
        cart.push(item);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartIcon();
}

function updateCartIcon() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (totalItems > 0) {
        $('.cart-icon').show();
        $('#cart-count').text('(' + totalItems + ') ');
    } else {
        $('.cart-icon').hide();
    }
}

function removeFromCart(productId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartIcon();
}

function updateCart(newCart) {
    localStorage.setItem('cart', JSON.stringify(newCart));
    updateCartIcon();
}

$(window).on('hashchange', function () {
    console.log('hashchange');
    loadBodyContent();
    posthog.capture('$pageview');
});

$(document).ready(function () {
    // Check if the navTemplate exists
    loadBodyContent();
});

function loadBodyContent() {
    if ($('#navTemplate').length === 0) {
        $.get('tmpl/navTemplate.html', function (template) {
            $('body').append(template);
            $("#navTemplate").tmpl({ navData: navData }).appendTo(".navbar");
            updateCartIcon();
        });
    } else {
        updateCartIcon();
    }

    fragment = getFragment();
    console.log('Current fragment:', fragment);
    // Get the config for the current fragment
    var frag_config = navDataMap[fragment];
    // Load the template for the current fragment
    template = 'tmpl/' + frag_config.template;
    if ($('#sectionTemplate').length > 0) {
        // Remove the current section template
        $("#sectionTemplate").remove();
    }
    $.get(template, function (template) {
        $('body').append(template);
        //  Remove the current contents of the t-body
        $("#t-body").empty();

        // First, execute the _before_load function if it exists to fetch data
        data = executeFn("_before_load");

        // If its a promise, wait for it to resolve
        if (data && typeof data.then === 'function') {
            // Return early and chain the template rendering after the promise resolves
            return data.then(function (resolvedData) {
                console.log('Data resolved:', resolvedData);
                renderTemplate(resolvedData || {});
            }).catch(function (error) {
                console.error('Error resolving data:', error);
                renderTemplate({});
            });
        } else {
            // For non-promise data, just render immediately
            renderTemplate(data || {});
        }


        // Helper function to avoid code duplication
        function renderTemplate(templateData) {
            console.log("Rendering template with data:", templateData);
            $("#sectionTemplate").tmpl(templateData).appendTo("#t-body").ready(function () {
                console.log("Template rendered for fragment:", fragment);
                executeFn("_after_load");
            });
        }

        // Don't continue with the code below when handling promises
        return;

    });

    if ($('#footerTemplate').length === 0) {
        $.get('tmpl/footerTemplate.html', function (template) {
            $('body').append(template);
            $("#footerTemplate").tmpl().appendTo(".footer");
        });
    }
}

function executeFn(postfix) {
    postload_fn_name = fragment + postfix;

    if (typeof window[postload_fn_name] === 'function') {
        return window[postload_fn_name]();
    } else
        return null;
}

function getFragment() {
    var hash = window.location.hash;
    if (hash === '') {
        return 'landing';
    }
    // Remove the leading '#' and request parameters
    var fragment = hash.substring(1).split('?')[0];
    // If the fragment is not in the navDataMap, default to 'landing'
    if (!navDataMap.hasOwnProperty(fragment)) {
        fragment = 'landing';
    }
    return fragment;
}
