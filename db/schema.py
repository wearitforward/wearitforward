#!/usr/bin/env python
"""
Generates the SQL schema for the project's database.
The schema is designed to store product information based on the structure
found in tmpl/productDetailsTemplate.html.
"""

SCHEMA = """
-- This schema is for storing product information.
-- It is designed to support listing and filtering products
-- based on the structure in tmpl/productDetailsTemplate.html.

-- Drop existing tables to start with a clean slate.
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS products;

-- The main table for products.
-- It uses JSONB for flexible attributes like images, categories, and other details.
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    -- ISO 4217 currency code, e.g., 'GBP'
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    -- JSON array of image URLs, e.g., '[".../product-7.jpg", ".../product-8.jpg"]'
    images JSONB,
    -- The main image to display on the product page.
    main_image_url VARCHAR(255),
    -- JSON array of category names, e.g., '["Man", "Clothing", "T-shirts"]'
    categories JSONB,
    -- Average rating, can be calculated from reviews.
    avg_rating NUMERIC(3, 2) DEFAULT 0.00,
    -- Total number of reviews.
    review_count INTEGER DEFAULT 0,
    -- Other details like brand, color, sizes, compositions.
    -- Example: '{"brand": "Somebrand", "color": "Black", "sizes": ["44", "46", "48"], "compositions": "Jeans"}'
    details JSONB
);

-- Table for product reviews.
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    reviewer_name VARCHAR(255) DEFAULT 'Anonymous',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
"""

def generate_schema():
    """Prints the SQL schema."""
    print(SCHEMA.strip())

if __name__ == '__main__':
    generate_schema()
