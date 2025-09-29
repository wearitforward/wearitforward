#!/usr/bin/env python3
"""
Single Image Regeneration Script

This script takes a single filename as an argument and uses the core
enhancement logic to regenerate it.
"""

import os
import sys
import argparse
from pathlib import Path

# Import the core logic
from enhancement_logic import Gemini25ClothingEnhancer, SOURCE_DIR, LOG_FILE

def main():
    """Main execution function for single image regeneration."""
    parser = argparse.ArgumentParser(description="Regenerate a single enhanced image.")
    parser.add_argument("filename", type=str, help="The filename of the image to process from the source directory.")
    parser.add_argument("--prompt", type=str, default="", help="Additional prompt instructions.")
    args = parser.parse_args()

    print(f"Gemini 2.5 Flash Single Image Regeneration Tool")
    print("=" * 50)

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ Missing GEMINI_API_KEY environment variable!")
        return 1

    image_path = SOURCE_DIR / args.filename
    if not image_path.exists():
        print(f"❌ Error: Image '{args.filename}' not found in {SOURCE_DIR}")
        return 1

    try:
        enhancer = Gemini25ClothingEnhancer(api_key)
        print(f"🚀 Regenerating: {args.filename}")
        success = enhancer.process_image(image_path, additional_prompt=args.prompt)
        
        if success:
            print(f"🎉 Regeneration Complete!")
            return 0
        else:
            print(f"❌ Regeneration Failed. Check logs: {LOG_FILE}")
            return 1
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())