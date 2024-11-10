var navData = [
    {
        title: "3 Col",
        link: "shop_product_col_3.html",
      },
      {
        title: "4 Col",
        link: "shop_product_col_4.html",
      },
      {
        title: "Product",
        link: "shop_single_product.html",
      },
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
  
  $(document).ready(function() {
    $.get('tmpl/navTemplate.html', function(template) {
      $('body').append(template);
      $("#navTemplate").tmpl({ navData: navData }).appendTo(".navbar");
    });

    $.get('tmpl/footerTemplate.html', function(template) {
        $('body').append(template);
        $("#footerTemplate").tmpl().appendTo(".footer");
      });
  });