

-- Drop existing tables to start with a clean slate.
DROP TABLE IF EXISTS product_attributes;
DROP TABLE IF EXISTS attributes;
DROP TABLE IF EXISTS products;

-- The main table for products.
-- It uses TEXT for flexible attributes like images, categories, and other details.
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    -- ISO 4217 currency code, e.g., 'GBP'
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    -- JSON array of image URLs, e.g., '[".../product-7.jpg", ".../product-8.jpg"]'
    images TEXT,
    -- The main image to display on the product page.
    main_image_url VARCHAR(255)
);

-- Table for key-value attributes that can be associated with products.
CREATE TABLE attributes (
    id INTEGER PRIMARY KEY,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    UNIQUE(key, value)
);

-- Intermediate table to link products with their attributes.
CREATE TABLE product_attributes (
    product_id INTEGER NOT NULL,
    attribute_id INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, attribute_id)
);

