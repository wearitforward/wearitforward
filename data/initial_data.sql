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

-- Insert attribute keys
INSERT INTO attribute_keys (id, key_name) VALUES
    (1, 'category'),
    (2, 'compositions'),
    (3, 'sizes'),
    (4, 'color'),
    (5, 'brand');

-- Insert attributes
INSERT INTO attributes (id, key_id, value) VALUES
    (1, 1, 'Man'),
    (2, 1, 'Clothing'),
    (3, 1, 'T-shirts'),
    (4, 2, 'Jeans'),
    (5, 3, '44, 46, 48'),
    (6, 4, 'Black'),
    (7, 5, 'Somebrand');

-- Link attributes to the product
INSERT INTO product_attributes (product_id, attribute_id) VALUES
    (1, 1),
    (1, 2),
    (1, 3),
    (1, 4),
    (1, 5),
    (1, 6),
    (1, 7);
