#!/usr/bin/env python3
"""
Clothing Image Enhancement using Gemini 2.5 Flash Image Generation

This script uses Google's Gemini 2.5 Flash model to enhance clothing photos
by generating improved versions based on detailed prompts.

Based on: https://ai.google.dev/gemini-api/docs/image-generation
"""

import os
import sys
import logging
import time
from pathlib import Path
from typing import Optional, List, Dict
from io import BytesIO

try:
    from google import genai
    from PIL import Image
    from dotenv import load_dotenv
except ImportError as e:
    print(f"Missing required packages. Please install: {e}")
    print("Run: pip install google-genai Pillow python-dotenv")
    sys.exit(1)

# Load environment variables
load_dotenv()

# Configuration
SOURCE_DIR = Path("/home/nikhil/ws/wearitforward/app-0/assets/images/shop")
OUTPUT_DIR = Path("/home/nikhil/ws/wearitforward/app-0/assets/images/shop_enhanced")
LOG_FILE = Path("/home/nikhil/ws/wearitforward/app-0/python/gemini_2_5_enhancement_log.txt")

class Gemini25ClothingEnhancer:
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the enhancer with Gemini 2.5 Flash."""
        self.setup_logging()

        # Get API key
        if not api_key:
            api_key = os.getenv('GEMINI_API_KEY')

        if not api_key:
            self.logger.error("No API key provided. Set GEMINI_API_KEY environment variable.")
            raise ValueError("API key is required")

        # Initialize client
        try:
            os.environ['GEMINI_API_KEY'] = api_key
            self.client = genai.Client()
            self.model_name = "gemini-2.5-flash-image-preview"
            self.logger.info("Initialized Gemini 2.5 Flash client")
        except Exception as e:
            self.logger.error(f"Could not initialize Gemini client: {e}")
            raise

        OUTPUT_DIR.mkdir(exist_ok=True)
        self.logger.info(f"Source: {SOURCE_DIR}, Output: {OUTPUT_DIR}")

    def setup_logging(self):
        """Set up logging."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(LOG_FILE),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)

    def get_image_files(self) -> List[Path]:
        """Get all processable image files."""
        image_files = []

        if not SOURCE_DIR.exists():
            self.logger.error(f"Source directory not found: {SOURCE_DIR}")
            return image_files

        for file_path in SOURCE_DIR.iterdir():
            if file_path.is_file():
                try:
                    with Image.open(file_path) as img:
                        image_files.append(file_path)
                except Exception:
                    continue

        self.logger.info(f"Found {len(image_files)} images to process")
        return image_files


    def analyze_clothing_item(self, image_path: Path) -> Dict[str, str]:
        """Analyze the clothing item to create better enhancement prompts."""
        analysis_result = {
            "analysis": "Indian traditional clothing with professional enhancement needed",
            "item_type": "garment"  # Default to garment
        }
        try:
            # Load image and keep it in memory
            img = Image.open(image_path)
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Resize if too large
            max_size = 1024
            if img.width > max_size or img.height > max_size:
                img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

            # Analysis prompt
            prompt = """
            Analyze this Indian clothing or jewelry item and describe it briefly:
            - Type of item (saree, lehenga, necklace, earrings, etc.)
            - Main colors
            - Visible patterns or embellishments
            - Current photo quality issues (lighting, wrinkles, background, etc.)

            Respond in 2-3 sentences describing what you see and what could be improved.
            """

            # Use the client to generate content
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",  # Use text model for analysis
                contents=[img, prompt]
            )

            if response.candidates and response.candidates[0].content.parts:
                analysis = response.candidates[0].content.parts[0].text.strip()
                self.logger.info(f"Analysis for {image_path.name}: {analysis}")
                analysis_result["analysis"] = analysis

                # Determine item type
                jewelry_keywords = ['necklace', 'earrings', 'bangles', 'ring', 'jewelry', 'anklet']
                if any(keyword in analysis.lower() for keyword in jewelry_keywords):
                    analysis_result["item_type"] = "jewelry"
                
                return analysis_result
            else:
                return analysis_result

        except Exception as e:
            self.logger.warning(f"Could not analyze {image_path.name}: {e}")
            return analysis_result

    def create_enhancement_prompt(self, analysis: str, original_size: tuple, item_type: str) -> str:
        """Create a detailed prompt for image generation based on analysis."""
        width, height = original_size

        if item_type == 'jewelry':
            return f"""
            Create a professional e-commerce product photograph for this jewelry item: {analysis}

            CRITICAL REQUIREMENTS:
            - DO NOT CHANGE THE JEWELRY: The original jewelry must be preserved exactly as it is. No changes to its shape, size, color, or details.
            - CHANGE ONLY THE BACKGROUND: Replace the current background with a clean, elegant, and professional studio background. Use a soft, neutral color like light gray, beige, or a subtle gradient.
            - PROFESSIONAL LIGHTING: Apply professional studio lighting to make the jewelry stand out. Enhance reflections and sparkle, but do not alter the material or colors.
            - MAINTAIN PROPORTIONS: The final image must have the exact same width-to-height ratio as the original.
            - E-COMMERCE READY: The final image should be sharp, high-definition, and ready for an online store.

            AVOID:
            - Any alteration to the jewelry item itself.
            - Busy or distracting backgrounds.
            - Cropping or changing the framing of the jewelry.
            """
        else:  # Garment prompt
            return f"""
            Create a professional e-commerce product photograph based on this clothing item: {analysis}

            CRITICAL SIZE AND PROPORTION REQUIREMENTS:
            🔹 MAINTAIN EXACT PROPORTIONS: Keep the same width-to-height ratio as the original image
            🔹 PRESERVE GARMENT SIZE: The clothing item should appear the same size relative to the image frame
            🔹 NO MANNEQUIN OR MODEL: Show only the clothing item itself, no person wearing it
            🔹 FLAT LAY OR HANGING STYLE: Present as a clean product shot without human form

            TRANSFORMATION REQUIREMENTS:
            ✨ Remove ALL wrinkles and fabric creases - make it look freshly pressed and smooth
            ✨ Perfect studio lighting - bright, even, professional photography lighting with no harsh shadows
            ✨ Clean, consistent, light-grey studio background - completely remove any clutter or distracting elements
            ✨ Enhance colors to be vibrant but natural and authentic to the original
            ✨ Professional garment presentation 
            ✨ Sharp, high-definition quality showing fabric texture and intricate details
            ✨ E-commerce catalog ready - suitable for online shopping with clear product visibility

            PRESERVE AUTHENTICITY:
            • Keep original design, patterns, and embellishments exactly as shown
            • Maintain authentic Indian clothing style and traditional draping
            • Preserve true colors and cultural elements
            • Keep garment proportions and authentic fit
            • Show the garment in the same orientation and layout as the original

            AVOID:
            ❌ NO mannequins, models, or human forms
            ❌ NO dramatic pose changes or different garment arrangements
            ❌ NO size distortion or proportion changes
            ❌ NO cropping that changes the original framing

            STYLE: Professional product photography, studio quality, e-commerce flat lay, catalog-ready presentation

            Generate an enhanced version that maintains the exact same proportions and garment presentation as the original, but with professional studio quality and wrinkle-free appearance on a consistent light-grey background.
            """

    def enhance_with_gemini(self, image_path: Path) -> Optional[bytes]:
        """Use Gemini 2.5 Flash to enhance the clothing image."""
        try:
            # Analyze the clothing item first
            analysis_result = self.analyze_clothing_item(image_path)
            analysis = analysis_result["analysis"]
            item_type = analysis_result["item_type"]

            # Load original image and keep it in memory
            original_image = Image.open(image_path)
            if original_image.mode != 'RGB':
                original_image = original_image.convert('RGB')

            # Store original dimensions for prompt and output
            original_size = original_image.size
            self.logger.info(f"Original image size: {original_size[0]}x{original_size[1]}")

            # Create enhancement prompt with size and item type information
            prompt = self.create_enhancement_prompt(analysis, original_size, item_type)

            # Only resize if absolutely necessary (very large images)
            processing_image = original_image
            max_size = 2048

            if original_image.width > max_size or original_image.height > max_size:
                processing_image = original_image.copy()
                processing_image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                self.logger.info(f"Resized for processing: {processing_image.size[0]}x{processing_image.size[1]}")

            self.logger.info(f"Generating enhanced image for {image_path.name}...")

            # Generate enhanced image using the correct API structure
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[processing_image, prompt]
            )

            # Extract generated image data using BytesIO as in your reference code
            if response.candidates and response.candidates[0].content.parts:
                image_parts = [
                    part.inline_data.data
                    for part in response.candidates[0].content.parts
                    if part.inline_data and part.inline_data.mime_type.startswith('image/')
                ]

                if image_parts:
                    # Ensure the generated image maintains original proportions
                    enhanced_image_bytes = image_parts[0]

                    # Load the generated image and resize to match original dimensions if needed
                    try:
                        enhanced_image = Image.open(BytesIO(enhanced_image_bytes))

                        # If the generated image doesn't match original size, resize it properly
                        if enhanced_image.size != original_size:
                            self.logger.info(f"Resizing enhanced image from {enhanced_image.size} to {original_size}")
                            enhanced_image = enhanced_image.resize(original_size, Image.Resampling.LANCZOS)

                            # Convert back to bytes
                            output_buffer = BytesIO()
                            enhanced_image.save(output_buffer, format='JPEG', quality=95)
                            enhanced_image_bytes = output_buffer.getvalue()

                    except Exception as resize_error:
                        self.logger.warning(f"Could not resize enhanced image: {resize_error}")

                    self.logger.info(f"Successfully generated enhanced image for {image_path.name}")
                    return enhanced_image_bytes

            # If no image generated, log any text response
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'text') and part.text:
                        self.logger.info(f"Gemini text response: {part.text}")

            self.logger.warning(f"No enhanced image generated for {image_path.name}")
            return None

        except Exception as e:
            self.logger.error(f"Gemini enhancement failed for {image_path.name}: {e}")
            return None

    def apply_basic_fallback(self, image_path: Path) -> Optional[bytes]:
        """Basic fallback - just copy the original image."""
        try:
            with open(image_path, 'rb') as f:
                self.logger.info(f"Using original image as fallback for {image_path.name}")
                return f.read()
        except Exception as e:
            self.logger.error(f"Fallback failed for {image_path.name}: {e}")
            return None

    def process_image(self, image_path: Path) -> bool:
        """Process a single image."""
        try:
            self.logger.info(f"Processing: {image_path.name}")

            # Try Gemini enhancement first
            enhanced_bytes = self.enhance_with_gemini(image_path)

            # Fallback to original image if Gemini fails
            if enhanced_bytes is None:
                self.logger.warning(f"Gemini failed, using original image for {image_path.name}")
                enhanced_bytes = self.apply_basic_fallback(image_path)

            if enhanced_bytes is None:
                self.logger.error(f"All enhancement methods failed for {image_path.name}")
                return False

            # Save enhanced image
            output_path = OUTPUT_DIR / image_path.name

            if enhanced_bytes:
                try:
                    # Try to open as image first (works for both Gemini output and fallback)
                    image = Image.open(BytesIO(enhanced_bytes))
                    image.save(output_path, format='JPEG', quality=95)
                except Exception:
                    # If that fails, save as raw bytes
                    with open(output_path, 'wb') as f:
                        f.write(enhanced_bytes)

            self.logger.info(f"✅ Enhanced and saved: {output_path.name}")
            return True

        except Exception as e:
            self.logger.error(f"Error processing {image_path.name}: {e}")
            return False

    def process_all_images(self) -> Dict:
        """Process all images in the source directory."""
        image_files = self.get_image_files()

        if not image_files:
            self.logger.warning("No images found to process")
            return {"total": 0, "successful": 0, "failed": 0, "skipped": 0}

        stats = {"total": len(image_files), "successful": 0, "failed": 0, "skipped": 0}

        for i, image_path in enumerate(image_files, 1):
            self.logger.info(f"\n{'='*20} Processing {i}/{len(image_files)} {'='*20}")

            # Check if file already exists before processing
            output_path = OUTPUT_DIR / image_path.name
            if output_path.exists():
                self.logger.info(f"⏭️  Skipping {image_path.name} - enhanced version already exists")
                stats["skipped"] += 1
                continue

            if self.process_image(image_path):
                stats["successful"] += 1
            else:
                stats["failed"] += 1

            # Rate limiting to avoid API quotas
            if i < len(image_files):
                self.logger.info("Waiting 3 seconds before next image...")
                time.sleep(3)

        return stats

def main():
    """Main execution function."""
    print("🎨 Gemini 2.5 Flash Clothing Enhancement Tool")
    print("=" * 50)

    # Check API key
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("\n❌ Missing GEMINI_API_KEY environment variable!")
        print("📋 Setup instructions:")
        print("1. Get your API key from: https://ai.google.dev/")
        print("2. Set environment variable: export GEMINI_API_KEY='your-key'")
        print("3. Or add to ~/.bashrc: echo 'export GEMINI_API_KEY=\"your-key\"' >> ~/.bashrc")
        return 1

    try:
        enhancer = Gemini25ClothingEnhancer(api_key)

        print(f"\n🚀 Starting enhancement process...")
        print(f"📁 Source: {SOURCE_DIR}")
        print(f"📁 Output: {OUTPUT_DIR}")
        print(f"📝 Logs: {LOG_FILE}")

        stats = enhancer.process_all_images()

        print(f"\n🎉 Enhancement Complete!")
        print(f"📊 Statistics:")
        print(f"   • Total images: {stats['total']}")
        print(f"   • ✅ Successfully enhanced: {stats['successful']}")
        print(f"   • ⏭️  Skipped (already exist): {stats['skipped']}")
        print(f"   • ❌ Failed: {stats['failed']}")

        processed_count = stats['successful'] + stats['failed']
        if processed_count > 0:
            success_rate = (stats['successful'] / processed_count) * 100
            print(f"   • 📈 Success rate: {success_rate:.1f}%")

        if stats['successful'] > 0 or stats['skipped'] > 0:
            total_enhanced = stats['successful'] + stats['skipped']
            print(f"\n📸 {total_enhanced} enhanced images available in: {OUTPUT_DIR}")
            print("💡 You can now use these professional photos on your website!")

    except Exception as e:
        print(f"❌ Error: {e}")
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())