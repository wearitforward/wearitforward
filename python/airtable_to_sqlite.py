import os
import requests
import json
import sqlite3
from dotenv import load_dotenv
from urllib.parse import urlparse

# --- Configuration (paths are relative to project root) ---
DB_PATH = "data/wif.db.sqlite"
SCHEMA_PATH = "data/schema.sql"
IMAGES_DIR = "assets/images/shop"

# From data/airtable_schema.json
INVENTORY_ITEMS_TABLE_ID = "tblVKOTcBAJTYpBau"
INVENTORY_ATTRIBUTES_TABLE_ID = "tblNvN1I84izhSlzn"

# --- Helper Functions ---

def fetch_all_airtable_records(base_id, pat, table_id):
    """Fetches all records from an Airtable table, handling pagination."""
    records = []
    url = f"https://api.airtable.com/v0/{base_id}/{table_id}"
    headers = {"Authorization": f"Bearer {pat}"}
    params = {}

    print(f"Fetching records from table {table_id}...")
    while True:
        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            records.extend(data.get('records', []))
            
            offset = data.get('offset')
            if offset:
                params['offset'] = offset
            else:
                break
        except requests.exceptions.RequestException as e:
            print(f"Error fetching from Airtable: {e}")
            return None
    print(f"Fetched {len(records)} records.")
    return records

def download_image_if_not_exists(url, target_dir):
    """Downloads an image from a URL to a target directory if it doesn't exist, and returns the web-accessible path."""
    try:
        # Sanitize filename from URL
        filename = os.path.basename(urlparse(url).path)
        local_path = os.path.join(target_dir, filename)
        
        # The web path should always use forward slashes.
        web_path = os.path.join(IMAGES_DIR, filename).replace(os.path.sep, '/')

        if not os.path.exists(local_path):
            print(f"Downloading: {filename}")
            response = requests.get(url, stream=True)
            response.raise_for_status()
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
        
        return web_path
    except requests.exceptions.RequestException as e:
        print(f"Error downloading {url}: {e}")
        return None
    except Exception as e:
        print(f"An error occurred processing {url}: {e}")
        return None

def setup_database():
    """Sets up the SQLite database by deleting the old one and applying the schema."""
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"Removed existing database: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        cursor.executescript(schema_sql)
        print(f"Database schema loaded from {SCHEMA_PATH}")
    except FileNotFoundError:
        print(f"Error: Schema file not found at {SCHEMA_PATH}")
        conn.close()
        return None, None
        
    conn.commit()
    return conn, cursor

def populate_products(conn, cursor, inventory_items):
    """Populates the products table from Airtable 'Inventory Items' records."""
    print("Populating 'products' table...")
    airtable_id_to_sqlite_id = {}

    # Ensure the target directory for images exists
    os.makedirs(IMAGES_DIR, exist_ok=True)
    
    for item in inventory_items:
        fields = item.get('fields', {})
        
        title = fields.get('Item Name')
        if not title:
            continue # Skip records without a title

        description = fields.get('Description', '')
        price = fields.get('Price', 0.0)
        
        airtable_images = fields.get('Images', [])
        local_image_paths = []
        if airtable_images:
            for img in airtable_images:
                if 'url' in img:
                    local_path = download_image_if_not_exists(img['url'], IMAGES_DIR)
                    if local_path:
                        local_image_paths.append(local_path)

        main_image_path = local_image_paths[0] if local_image_paths else None
        images_json = json.dumps(local_image_paths)
        
        # Assuming USD from Airtable's '$' symbol, as seen in schema.json
        currency = 'USD'
        
        cursor.execute("""
            INSERT INTO products (title, description, price, currency, images, main_image_url)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (title, description, price, currency, images_json, main_image_path))
        
        sqlite_id = cursor.lastrowid
        airtable_id_to_sqlite_id[item['id']] = sqlite_id
        
    conn.commit()
    print(f"Inserted {len(airtable_id_to_sqlite_id)} products.")
    return airtable_id_to_sqlite_id

def populate_attributes(conn, cursor, inventory_attributes, product_id_map):
    """Populates attribute-related tables."""
    print("Populating attribute tables...")
    
    key_cache = {} # key_name -> key_id
    attribute_cache = {} # (key_id, value) -> attribute_id
    insert_count = 0
    
    for attr in inventory_attributes:
        fields = attr.get('fields', {})
        key_name = fields.get('Key')
        value = fields.get('Value')
        related_item_ids = fields.get('Related Inventory Items', [])
        
        if not key_name or not value or not related_item_ids:
            continue
            
        # --- Handle attribute_keys ---
        if key_name not in key_cache:
            cursor.execute("SELECT id FROM attribute_keys WHERE key_name = ?", (key_name,))
            result = cursor.fetchone()
            if result:
                key_id = result[0]
            else:
                cursor.execute("INSERT INTO attribute_keys (key_name) VALUES (?)", (key_name,))
                key_id = cursor.lastrowid
            key_cache[key_name] = key_id
        else:
            key_id = key_cache[key_name]
            
        # --- Handle attributes ---
        if (key_id, value) not in attribute_cache:
            cursor.execute("SELECT id FROM attributes WHERE key_id = ? AND value = ?", (key_id, value))
            result = cursor.fetchone()
            if result:
                attribute_id = result[0]
            else:
                cursor.execute("INSERT INTO attributes (key_id, value) VALUES (?, ?)", (key_id, value))
                attribute_id = cursor.lastrowid
            attribute_cache[(key_id, value)] = attribute_id
        else:
            attribute_id = attribute_cache[(key_id, value)]
        
        # --- Handle product_attributes ---
        for airtable_product_id in related_item_ids:
            sqlite_product_id = product_id_map.get(airtable_product_id)
            if sqlite_product_id:
                try:
                    cursor.execute("""
                        INSERT INTO product_attributes (product_id, attribute_id)
                        VALUES (?, ?)
                    """, (sqlite_product_id, attribute_id))
                    insert_count += 1
                except sqlite3.IntegrityError:
                    # This pair might already exist, which is fine.
                    pass
    
    conn.commit()
    print(f"Populated attribute tables. Inserted {insert_count} product-attribute links.")


def main():
    """Main function to run the data pipeline."""
    # This script assumes it is run from the project root.
    # The __main__ block below ensures the CWD is correct.
    
    load_dotenv()
    pat = os.getenv("AIRTABLE_PAT")
    base_id = os.getenv("AIRTABLE_BASE_ID")
    
    if not pat or not base_id:
        print(f"Error: AIRTABLE_PAT and AIRTABLE_BASE_ID must be set in your .env file.")
        return

    # 1. Setup Database
    conn, cursor = setup_database()
    if not conn:
        return
        
    # 2. Fetch data from Airtable
    inventory_items = fetch_all_airtable_records(base_id, pat, INVENTORY_ITEMS_TABLE_ID)
    inventory_attributes = fetch_all_airtable_records(base_id, pat, INVENTORY_ATTRIBUTES_TABLE_ID)
    
    if inventory_items is None or inventory_attributes is None:
        print("Failed to fetch data from Airtable. Aborting.")
        conn.close()
        return

    # 3. Populate tables
    product_id_map = populate_products(conn, cursor, inventory_items)
    populate_attributes(conn, cursor, inventory_attributes, product_id_map)
    
    # 4. Clean up
    conn.close()
    print("\nProcess complete.")
    print(f"Staging database created at: {DB_PATH}")


if __name__ == "__main__":
    # Change CWD to project root to find files correctly
    # so this script can be run from any directory
    project_root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(os.path.join(project_root, '..'))
    main()
