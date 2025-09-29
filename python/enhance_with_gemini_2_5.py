#!/usr/bin/env python3
"""
Clothing Image Enhancement using Gemini 2.5 Flash Image Generation (Batch Processor)

This script finds all images in the source directory and uses the core
enhancement logic to process them in a batch.
"""

import os
import sys
import time
from pathlib import Path
from typing import Dict

# Import the core logic
from enhancement_logic import Gemini25ClothingEnhancer, SOURCE_DIR, OUTPUT_DIR, LOG_FILE

def get_image_files_to_process():
    """Get all processable image files that haven't been enhanced yet."""
    if not SOURCE_DIR.exists():
        print(f"Source directory not found: {SOURCE_DIR}")
        return []

    all_files = [p for p in SOURCE_DIR.iterdir() if p.is_file()]
    
    # Filter out files that already exist in the output directory
    images_to_process = [
        p for p in all_files 
        if not (OUTPUT_DIR / p.name).exists()
    ]
    
    skipped_count = len(all_files) - len(images_to_process)
    print(f"Found {len(all_files)} total images.")
    if skipped_count > 0:
        print(f"Skipping {skipped_count} images that already have an enhanced version.")
    
    return images_to_process

def main():
    """Main execution function."""
    print("Gemini 2.5 Flash Clothing Enhancement Tool (Batch Mode)")
    print("=" * 50)

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("\n❌ Missing GEMINI_API_KEY environment variable!")
        return 1

    try:
        enhancer = Gemini25ClothingEnhancer(api_key)
        image_files = get_image_files_to_process()

        if not image_files:
            print("\nNo new images to process.")
            return 0

        print(f"\n🚀 Starting enhancement process for {len(image_files)} images...")
        print(f"📁 Source: {SOURCE_DIR}")
        print(f"📁 Output: {OUTPUT_DIR}")
        print(f"📝 Logs: {LOG_FILE}")

        stats = {"total": len(image_files), "successful": 0, "failed": 0}

        for i, image_path in enumerate(image_files, 1):
            print(f"\n{'='*20} Processing {i}/{len(image_files)} {'='*20}")
            if enhancer.process_image(image_path):
                stats["successful"] += 1
            else:
                stats["failed"] += 1
            
            if i < len(image_files):
                print("Waiting 3 seconds before next image...")
                time.sleep(3)

        print("\n🎉 Enhancement Complete!")
        print(f"📊 Statistics:")
        print(f"   • Total images processed: {stats['total']}")
        print(f"   • ✅ Successfully enhanced: {stats['successful']}")
        print(f"   • ❌ Failed: {stats['failed']}")

    except Exception as e:
        print(f"❌ Error: {e}")
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())
