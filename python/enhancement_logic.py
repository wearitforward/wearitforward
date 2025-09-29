#!/usr/bin/env python3
"""
Core Image Enhancement Logic for Wear It Forward Project
"""

import os
import sys
import logging
from pathlib import Path
from typing import Optional, Dict
from io import BytesIO

try:
    from google import genai
    from PIL import Image, ImageOps
    from dotenv import load_dotenv
except ImportError as e:
    print(f"Missing required packages. Please install: {e}")
    print("Run: pip install google-genai Pillow python-dotenv")
    sys.exit(1)

# Load environment variables
load_dotenv()

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
SOURCE_DIR = PROJECT_ROOT / "assets/images/shop"
OUTPUT_DIR = PROJECT_ROOT / "assets/images/shop_enhanced"
LOG_FILE = PROJECT_ROOT / "python/gemini_2_5_enhancement_log.txt"

class Gemini25ClothingEnhancer:
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the enhancer with Gemini 2.5 Flash."""
        self.setup_logging()

        if not api_key:
            api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            self.logger.error("No API key provided. Set GEMINI_API_KEY environment variable.")
            raise ValueError("API key is required")

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

    def crop_to_aspect_ratio(self, image: Image.Image, aspect_ratio: float) -> Image.Image:
        """Crops an image to a target aspect ratio from the center."""
        original_width, original_height = image.size
        original_aspect = original_width / original_height

        if original_aspect > aspect_ratio:
            new_width = int(aspect_ratio * original_height)
            offset = (original_width - new_width) // 2
            return image.crop((offset, 0, offset + new_width, original_height))
        else:
            new_height = int(original_width / aspect_ratio)
            offset = (original_height - new_height) // 2
            return image.crop((0, offset, original_width, offset + new_height))

    def analyze_clothing_item(self, image_path: Path) -> Dict[str, str]:
        """Analyze the clothing item to create better enhancement prompts."""
        analysis_result = {"analysis": "Indian traditional clothing", "item_type": "garment"}
        try:
            img = Image.open(image_path)
            img = ImageOps.exif_transpose(img)
            if img.mode != 'RGB':
                img = img.convert('RGB')

            prompt = "Analyze this Indian clothing or jewelry item..."
            response = self.client.models.generate_content(model="gemini-2.5-flash", contents=[img, prompt])
            
            if response.candidates and response.candidates[0].content.parts:
                analysis = response.candidates[0].content.parts[0].text.strip()
                analysis_result["analysis"] = analysis
                jewelry_keywords = ['necklace', 'earrings', 'bangles', 'ring', 'jewelry']
                if any(keyword in analysis.lower() for keyword in jewelry_keywords):
                    analysis_result["item_type"] = "jewelry"
            return analysis_result
        except Exception as e:
            self.logger.warning(f"Could not analyze {image_path.name}: {e}")
            return analysis_result

    def create_enhancement_prompt(self, analysis: str, item_type: str, additional_prompt: str = "") -> str:
        """Create a detailed prompt for image generation based on analysis."""
        base_prompt = ""
        # print analysis for debugging
        self.logger.info(f"Item analysis: {analysis}, Type: {item_type}")

        if item_type == 'jewelry':
            base_prompt = f"""
            Create a professional e-commerce product photograph for this jewelry item: {analysis}
            CRITICAL REQUIREMENTS:
            - TARGET ASPECT RATIO: 3:4 portrait.
            - DO NOT CHANGE THE JEWELRY.
            - CENTER THE ITEM and EXTEND THE BACKGROUND to fill the new dimensions with a clean, elegant, professional studio look.
            """
        else:  # Garment prompt
            base_prompt = f"""
            Create a e-commerce product photograph based on this clothing item: {analysis}

            CRITICAL REQUIREMENTS:
            - TARGET ASPECT RATIO: Generate the image with a 3:4 portrait aspect ratio (width:height).
            - PRESERVE GARMENT PROPORTIONS: The garment's own proportions (e.g., length of sleeves to body, width to length) MUST NOT BE CHANGED.
            - CENTER THE GARMENT: Ensure the entire garment is visible and centered in the new 3:4 frame.
            - FLAT LAY OR HANGING STYLE: Present as a clean product shot without a body form. NO MANNEQUINS OR BODY SHAPES. Do not invent a person, mannequin, or even a "ghost" or invisible body shape. The garment should be presented flat or hanging on its own.
            - Remove wrinkles and the garment must appear ironed, and freshly pressed.

            TRANSFORMATION REQUIREMENTS:
            - CRITICAL: REMOVE ALL WRINKLES. The garment must appear perfectly smooth, ironed, and freshly pressed. Eliminate every single crease and fold from the fabric.
            - EXTEND THE BACKGROUND: Intelligently extend the background to fill the new 3:4 dimensions.
            - PERFECT STUDIO LIGHTING: Bright, even, professional lighting with no harsh shadows.
            - CLEAN BACKGROUND: Use a consistent, light-grey studio background.
            - VIBRANT COLORS: Enhance colors to be vibrant but natural and authentic.

            PRESERVE AUTHENTICITY:
            - Keep original design, patterns, and embellishments exactly as shown.
            - Keep garment proportions and authentic fit.
            - Present the garment upright, in the same layout as the input image.

            AVOID:
            - CRITICAL: NO MANNEQUINS OR BODY SHAPES. Do not invent a person, mannequin, or even a "ghost" or invisible body shape. The garment should be presented flat or hanging on its own.
            - NO dramatic pose changes or different garment arrangements.
            - CRITICAL: DO NOT ALTER THE GARMENT'S INTRINSIC PROPORTIONS. The output must have the exact same shape and fit. Do not change the perceived size or age category (e.g., adult vs. child).
            - NO cropping that cuts off parts of the garment.

            STYLE: Professional product photography, studio quality, e-commerce flat lay, catalog-ready.
            """
        
        if additional_prompt:
            base_prompt += f"\nADDITIONAL INSTRUCTIONS: {additional_prompt}"
            
        return base_prompt

    def enhance_with_gemini(self, image_path: Path, additional_prompt: str = "") -> Optional[bytes]:
        """Use Gemini to enhance the image."""
        try:
            analysis_result = self.analyze_clothing_item(image_path)
            prompt = self.create_enhancement_prompt(
                analysis_result["analysis"], 
                analysis_result["item_type"], 
                additional_prompt
            )
            
            original_image = Image.open(image_path)
            original_image = ImageOps.exif_transpose(original_image)
            if original_image.mode != 'RGB':
                original_image = original_image.convert('RGB')

            self.logger.info(f"Generating enhanced image for {image_path.name}...")
            response = self.client.models.generate_content(model=self.model_name, contents=[original_image, prompt])

            if response.candidates and response.candidates[0].content.parts:
                image_parts = [p for p in response.candidates[0].content.parts if p.inline_data]
                if image_parts:
                    image_data = image_parts[0].inline_data.data
                    enhanced_image = Image.open(BytesIO(image_data))
                    cropped_image = self.crop_to_aspect_ratio(enhanced_image, 3/4)
                    resized_image = cropped_image.resize((1200, 1600), Image.Resampling.LANCZOS)
                    output_buffer = BytesIO()
                    resized_image.save(output_buffer, format='JPEG', quality=95)
                    self.logger.info(f"Successfully generated enhanced image for {image_path.name}")
                    return output_buffer.getvalue()
                else:
                    text_response = " ".join([p.text for p in response.candidates[0].content.parts if hasattr(p, 'text')])
                    self.logger.error(f"Gemini enhancement failed. No image data. Response: {text_response}")
                    return None
            return None
        except Exception as e:
            self.logger.error(f"Gemini enhancement failed for {image_path.name}: {e}")
            return None

    def process_image(self, image_path: Path, additional_prompt: str = "") -> bool:
        """Process a single image."""
        try:
            self.logger.info(f"Processing: {image_path.name}")
            enhanced_bytes = self.enhance_with_gemini(image_path, additional_prompt)
            if not enhanced_bytes:
                return False
            
            output_path = OUTPUT_DIR / image_path.name
            with open(output_path, 'wb') as f:
                f.write(enhanced_bytes)
            self.logger.info(f"✅ Enhanced and saved: {output_path.name}")
            return True
        except Exception as e:
            self.logger.error(f"Error processing {image_path.name}: {e}")
            return False