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

        data = executeFn("_before_load");
        

        $("#sectionTemplate").tmpl(data).appendTo("#t-body").ready(function () {
            executeFn("_after_load");

            // Add the active class to the current menu item
            // var fragment = getFragment();
            // $('a[href$="' + fragment + '"]').addClass('active');
            // alert('ready');
        })
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
    var fragment = window.location.hash.substr(1);
    if (fragment === '') {
        fragment = 'landing';
    }
    return fragment;
}