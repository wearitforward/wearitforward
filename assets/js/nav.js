const navDataMap = {
    "landing": {
        title: "Home",
        template: "landingTemplate.html",
        link: "index.html#landing",
    },
    "productList": {
        title: "Shop",
        template: "productListTemplate.html",
        link: "index.html#productList",
    },
    "productDetails": {
        title: "Product Details",
        template: "productDetailsTemplate.html",
        link: "index.html#productDetails",
    },
    "donate": {
        title: "Donate",
        template: "donateTemplate.html",
        link: "index.html#donate",
    },
    "howItWorks": {
        title: "How it works",
        template: "howItWorksTemplate.html",
        link: "index.html#howItWorks",
    },
    "blog": {
        title: "Blog",
        link: "https://blog.wearitforward.org",
    },
    "aboutUs": {
        title: "About Us",
        template: "aboutUsTemplate.html",
        link: "index.html#aboutUs",
    },
}

// Generate the navData array from the navDataMap
const navData = [];
for (var key in navDataMap) {
    navData.push({
        name: key,
        title: navDataMap[key].title,
        link: navDataMap[key].link,
        template: navDataMap[key].template,
    });
}



$(window).on('hashchange', function () {
    console.log('hashchange');
    loadBodyContent();

});

$(document).ready(function () {
    // Check if the navTemplate exists
    loadBodyContent();
});

function loadBodyContent() {
    if ($('#navTemplate').length === 0) {
        $.get('tmpl/navTemplate.html', function (template) {
            $('body').append(template);
            $("#navTemplate").tmpl({ navData: navData }).appendTo(".navbar")
        });
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