-- This file contains initial data for the products and reviews tables.                                                                                 
-- It is based on the static content from the original product details template.                                                                        
                                                                                                                                                        

-- Insert a sample product based on the 'Accessories Pack'
INSERT INTO products (id, title, description, price, currency, images, main_image_url)
VALUES (
    1,
    'Accessories Packs',
    'The European languages are members of the same family. Their separate existence is a myth. For science, music, sport, etc, Europe uses the same vocabulary. The languages only differ in their grammar, their pronunciation and their most common words.',
    20.00,
    'GBP',
    '["assets/images/shop/product-7.jpg", "assets/images/shop/product-8.jpg", "assets/images/shop/product-9.jpg", "assets/images/shop/product-10.jpg"]',
    'assets/images/shop/product-7.jpg'
);

-- Insert attributes
INSERT INTO attributes (id, key, value) VALUES
    (1, 'category', 'Man'),
    (2, 'category', 'Clothing'),
    (3, 'category', 'T-shirts'),
    (4, 'compositions', 'Jeans'),
    (5, 'sizes', '44, 46, 48'),
    (6, 'color', 'Black'),
    (7, 'brand', 'Somebrand');

-- Link attributes to the product
INSERT INTO product_attributes (product_id, attribute_id) VALUES
    (1, 1),
    (1, 2),
    (1, 3),
    (1, 4),
    (1, 5),
    (1, 6),
    (1, 7);
