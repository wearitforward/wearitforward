-- This file contains initial data for the project.
-- It populates the database with a variety of sample products and their attributes.

-- Insert products
INSERT INTO products (id, title, description, price, currency, images, main_image_url) VALUES
    (1, 'Accessories Pack', 'A collection of essential accessories. The languages only differ in their grammar, their pronunciation and their most common words.', 20.00, 'GBP', '["assets/images/shop/product-7.jpg", "assets/images/shop/product-8.jpg"]', 'assets/images/shop/product-7.jpg'),
    (2, 'Men''s Casual T-Shirt', 'A classic cotton t-shirt for everyday comfort. Perfect for a casual look.', 15.00, 'GBP', '["assets/images/shop/product-9.jpg"]', 'assets/images/shop/product-9.jpg'),
    (3, 'Women''s Skinny Jeans', 'Stylish and comfortable skinny jeans that hug in all the right places.', 45.00, 'GBP', '["assets/images/shop/product-10.jpg"]', 'assets/images/shop/product-10.jpg'),
    (4, 'Leather Belt', 'A high-quality leather belt that adds a touch of class to any outfit.', 25.00, 'GBP', '["assets/images/shop/product-11.jpg"]', 'assets/images/shop/product-11.jpg'),
    (5, 'Summer Dress', 'A light and breezy summer dress, perfect for warm weather and sunny days.', 55.00, 'GBP', '["assets/images/shop/product-12.jpg"]', 'assets/images/shop/product-12.jpg'),
    (6, 'Running Shoes', 'Comfortable and durable shoes designed for your daily run or gym session.', 75.00, 'GBP', '["assets/images/shop/product-13.jpg"]', 'assets/images/shop/product-13.jpg'),
    (7, 'Wool Scarf', 'Keep warm and stylish with this soft, 100% wool scarf.', 30.00, 'GBP', '["assets/images/shop/product-14.jpg"]', 'assets/images/shop/product-14.jpg'),
    (8, 'Men''s Formal Shirt', 'A crisp white shirt made from premium cotton, ideal for formal occasions.', 40.00, 'GBP', '["assets/images/shop/product-7.jpg"]', 'assets/images/shop/product-7.jpg'),
    (9, 'Canvas Backpack', 'A durable and spacious backpack for everyday use, with multiple compartments.', 35.00, 'GBP', '["assets/images/shop/product-8.jpg"]', 'assets/images/shop/product-8.jpg'),
    (10, 'Women''s Blouse', 'An elegant blouse perfect for the office or an evening out.', 38.00, 'GBP', '["assets/images/shop/product-9.jpg"]', 'assets/images/shop/product-9.jpg'),
    (11, 'Denim Jacket', 'A timeless denim jacket that never goes out of style. A wardrobe essential.', 65.00, 'GBP', '["assets/images/shop/product-10.jpg"]', 'assets/images/shop/product-10.jpg'),
    (12, 'Classic Sunglasses', 'Protect your eyes from the sun with these stylish, UV-blocking sunglasses.', 50.00, 'GBP', '["assets/images/shop/product-11.jpg"]', 'assets/images/shop/product-11.jpg');

-- Insert attribute keys
INSERT INTO attribute_keys (id, key_name) VALUES
    (1, 'category'),
    (2, 'compositions'),
    (3, 'sizes'),
    (4, 'color'),
    (5, 'brand'),
    (6, 'material');

-- Insert attributes
INSERT INTO attributes (id, key_id, value) VALUES
    (1, 1, 'Man'), (2, 1, 'Clothing'), (3, 1, 'T-shirts'), (4, 2, 'Jeans'), (5, 3, '44, 46, 48'), (6, 4, 'Black'), (7, 5, 'Somebrand'),
    (8, 1, 'Woman'), (9, 1, 'Accessories'), (10, 1, 'Shoes'), (11, 2, 'Cotton'), (12, 2, 'Polyester'), (13, 3, 'S, M, L'), (14, 3, 'One Size'),
    (15, 4, 'White'), (16, 4, 'Blue'), (17, 4, 'Red'), (18, 4, 'Brown'), (19, 5, 'CoolBrand'), (20, 5, 'FashionCo'), (21, 6, 'Leather'),
    (22, 6, 'Wool'), (23, 6, 'Canvas'), (24, 6, 'Denim'), (25, 6, 'Plastic');

-- Link attributes to products
INSERT INTO product_attributes (product_id, attribute_id) VALUES
    -- Product 1: Accessories Pack
    (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7),
    -- Product 2: Men's Casual T-Shirt
    (2, 1), (2, 2), (2, 3), (2, 11), (2, 13), (2, 16), (2, 19),
    -- Product 3: Women's Skinny Jeans
    (3, 8), (3, 2), (3, 4), (3, 13), (3, 16), (3, 20),
    -- Product 4: Leather Belt
    (4, 1), (4, 9), (4, 21), (4, 14), (4, 18), (4, 7),
    -- Product 5: Summer Dress
    (5, 8), (5, 2), (5, 11), (5, 13), (5, 15), (5, 20),
    -- Product 6: Running Shoes
    (6, 1), (6, 8), (6, 10), (6, 12), (6, 5), (6, 6), (6, 19),
    -- Product 7: Wool Scarf
    (7, 9), (7, 22), (7, 14), (7, 17), (7, 20),
    -- Product 8: Men's Formal Shirt
    (8, 1), (8, 2), (8, 11), (8, 13), (8, 15), (8, 7),
    -- Product 9: Canvas Backpack
    (9, 9), (9, 23), (9, 14), (9, 6), (9, 19),
    -- Product 10: Women's Blouse
    (10, 8), (10, 2), (10, 12), (10, 13), (10, 15), (10, 20),
    -- Product 11: Denim Jacket
    (11, 2), (11, 24), (11, 13), (11, 16), (11, 19),
    -- Product 12: Classic Sunglasses
    (12, 9), (12, 25), (12, 6), (12, 19);
