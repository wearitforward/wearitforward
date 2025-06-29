import os
import requests
import json
from dotenv import load_dotenv

def fetch_airtable_schema():
    """
    Fetches the schema from Airtable for a specific base and saves it to a file.
    """
    load_dotenv()

    pat = os.getenv("AIRTABLE_PAT")
    base_id = os.getenv("AIRTABLE_BASE_ID")

    if not pat or not base_id:
        print("Error: AIRTABLE_PAT and AIRTABLE_BASE_ID must be set in your environment or a .env file.")
        return

    url = f"https://api.airtable.com/v0/meta/bases/{base_id}/tables"
    headers = {
        "Authorization": f"Bearer {pat}"
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Raises an HTTPError for bad responses (4xx or 5xx)

        schema = response.json()

        output_file = "data/airtable_schema.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(schema, f, indent=2, ensure_ascii=False)

        print(f"Schema successfully fetched and saved to {output_file}")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching schema from Airtable: {e}")

if __name__ == "__main__":
    fetch_airtable_schema()
