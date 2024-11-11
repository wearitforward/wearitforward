var navData = [
    {
        title: "Home",
        link: "index.html#landing",
    },{
        title: "Shop",
        link: "index.html#productList",
    },{
        title: "Donate",
        link: "index.html#donate    ",
    },{
        title: "How it works",
        link: "index.html#howItWorks",
    },
    {
        title: "Blog",
        link: "https://blog.wearitforward.org",
    },{
        title: "About Us",
        link: "index.html#aboutUs",
    },
    // {
    //     title: "3 Col",
    //     link: "shop_product_col_3.html",
    //   },
    //   {
    //     title: "4 Col",
    //     link: "shop_product_col_4.html",
    //   },
    //   {
    //     title: "Product",
    //     link: "shop_single_product.html",
    //   },
          // {
    //   title: "Home",
    //   link: "#",
    //   subMenu: [
    //     { title: "Default", link: "index_mp_fullscreen_video_background.html" },
    //     { title: "One Page", link: "index_op_fullscreen_gradient_overlay.html" },
    //     { title: "Agency", link: "index_agency.html" },
    //     { title: "Portfolio", link: "index_portfolio.html" },
    //     { title: "Restaurant", link: "index_restaurant.html" },
    //     { title: "Finance", link: "index_finance.html" },
    //     { title: "Landing Page", link: "index_landing.html" },
    //     { title: "Photography", link: "index_photography.html" },
    //     { title: "Shop", link: "index_shop.html" }
    //   ]
    // },

    // Add more menu items as needed
  ];

  $(window).on('hashchange', function() {
    console.log('hashchange');
    loadBodyContent();

});
  
  $(document).ready(function() {
    // Check if the navTemplate exists
    loadBodyContent();
  });

function loadBodyContent() {
    if ($('#navTemplate').length === 0) {
        $.get('tmpl/navTemplate.html', function (template) {
            $('body').append(template);
            $("#navTemplate").tmpl({ navData: navData }).appendTo(".navbar");
        });
    }

    fragment = getFragment();
    template = 'tmpl/' + fragment + 'Template.html';
    if ($('#sectionTemplate').length > 0) {
        // Remove the current section template
        $("#sectionTemplate").remove();
    }
    $.get(template, function (template) {
        $('body').append(template);
        //  Remove the current contents of the t-body
        $("#t-body").empty();        
        $("#sectionTemplate").tmpl().appendTo("#t-body");
    });

    if ($('#footerTemplate').length === 0) {
        $.get('tmpl/footerTemplate.html', function (template) {
            $('body').append(template);
            $("#footerTemplate").tmpl().appendTo(".footer");
        });
    }
}

    function getFragment() {
        var fragment = window.location.hash.substr(1);
        if (fragment === '') {
            fragment = 'landing';
        }
        return fragment;
    }