-- This file contains initial data for the products and reviews tables.                                                                                 
-- It is based on the static content from the original product details template.                                                                        
                                                                                                                                                        

-- Insert a sample product based on the 'Accessories Pack'
INSERT INTO products (title, description, price, currency, images, main_image_url, categories, details)
VALUES (
    'Accessories Packs',
    'The European languages are members of the same family. Their separate existence is a myth. For science, music, sport, etc, Europe uses the same vocabulary. The languages only differ in their grammar, their pronunciation and their most common words.',
    20.00,
    'GBP',
    '["assets/images/shop/product-7.jpg", "assets/images/shop/product-8.jpg", "assets/images/shop/product-9.jpg", "assets/images/shop/product-10.jpg"]',
    'assets/images/shop/product-7.jpg',
    '["Man", "Clothing", "T-shirts"]',
    '{"brand": "Somebrand", "color": "Black", "sizes": ["44", "46", "48"], "compositions": "Jeans"}'
);
