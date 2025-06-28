

-- Drop existing tables to start with a clean slate.
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS products;

-- The main table for products.
-- It uses TEXT for flexible attributes like images, categories, and other details.
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    -- ISO 4217 currency code, e.g., 'GBP'
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    -- JSON array of image URLs, e.g., '[".../product-7.jpg", ".../product-8.jpg"]'
    images TEXT,
    -- The main image to display on the product page.
    main_image_url VARCHAR(255),
    -- JSON array of category names, e.g., '["Man", "Clothing", "T-shirts"]'
    categories TEXT,
    -- Other details like brand, color, sizes, compositions.
    -- Example: '{"brand": "Somebrand", "color": "Black", "sizes": ["44", "46", "48"], "compositions": "Jeans"}'
    details TEXT
);

