import os
import json
import hashlib
import subprocess
import sys
import shutil
from pathlib import Path
from typing import List
import uvicorn

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# --- Configuration ---
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
SHOP_DIR = PROJECT_ROOT / "assets/images/shop"
ENHANCED_DIR = PROJECT_ROOT / "assets/images/shop_enhanced"
REGEN_SCRIPT = PROJECT_ROOT / "python/regenerate_image.py"

app = FastAPI()

# --- Models ---
class ImageRequest(BaseModel):
    filename: str
    prompt: str = ""

class CopyRequest(BaseModel):
    filename: str

# --- Image Comparison Logic ---
def get_differing_images() -> List[str]:
    """
    Finds images with the same name in both directories but with different content.
    Returns a sorted list of filenames.
    """
    print("Scanning directories and comparing image hashes...")
    shop_files = {f for f in os.listdir(SHOP_DIR) if os.path.isfile(SHOP_DIR / f)}
    enhanced_files = {f for f in os.listdir(ENHANCED_DIR) if os.path.isfile(ENHANCED_DIR / f)}
    
    common_files = sorted(list(shop_files.intersection(enhanced_files)))
    
    diff_files = []
    for filename in common_files:
        try:
            path1 = SHOP_DIR / filename
            path2 = ENHANCED_DIR / filename
            hash1 = hashlib.sha256(path1.read_bytes()).hexdigest()
            hash2 = hashlib.sha256(path2.read_bytes()).hexdigest()
            if hash1 != hash2:
                diff_files.append(filename)
        except Exception as e:
            print(f"Could not process {filename}: {e}")
            
    print(f"Found {len(diff_files)} differing images out of {len(common_files)} common images.")
    return diff_files

# Store the list of images in memory
differing_images = get_differing_images()

# --- Static File Serving ---
app.mount("/shop", StaticFiles(directory=SHOP_DIR), name="shop")
app.mount("/shop_enhanced", StaticFiles(directory=ENHANCED_DIR), name="shop_enhanced")

# --- API Endpoints ---
@app.get("/api/images", response_class=JSONResponse)
async def get_images_list():
    return differing_images

@app.post("/api/regenerate", response_class=JSONResponse)
async def handle_regenerate(request: ImageRequest):
    filename = request.filename
    if not (SHOP_DIR / filename).exists():
        raise HTTPException(status_code=404, detail="Original image not found")

    print(f"Received request to regenerate: {filename}")
    command = [sys.executable, str(REGEN_SCRIPT), filename]
    if request.prompt:
        command.extend(['--prompt', request.prompt])
    
    try:
        process = subprocess.run(
            command, capture_output=True, text=True, check=True, encoding='utf-8'
        )
        print("Regeneration script stdout:", process.stdout)
        print("Regeneration script stderr:", process.stderr)
        return {"status": "success", "message": f'{filename} regenerated.'}
    except subprocess.CalledProcessError as e:
        error_message = f"Stdout: {e.stdout}\nStderr: {e.stderr}"
        print(f"Regeneration script failed!\n{error_message}")
        raise HTTPException(status_code=500, detail=f"Regeneration failed:\n{error_message}")

@app.post("/api/copy", response_class=JSONResponse)
async def handle_copy(request: CopyRequest):
    filename = request.filename
    source_path = ENHANCED_DIR / filename
    dest_path = SHOP_DIR / filename

    if not source_path.exists():
        raise HTTPException(status_code=404, detail="Enhanced image not found to copy")

    try:
        shutil.copy2(source_path, dest_path)
        print(f"Successfully copied {filename}.")
        return {"status": "success", "message": f'{filename} copied to original.'}
    except Exception as e:
        print(f"Copy failed: {e}")
        raise HTTPException(status_code=500, detail=f"Could not copy file: {e}")

# --- HTML Serving ---
@app.get("/", response_class=HTMLResponse)
async def get_root():
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Image Comparison</title>
    <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; background-color: #f0f2f5; margin: 0; }
        #container { display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; width: 95%; }
        .image-box { width: 45vw; border: 1px solid #ccc; padding: 10px; text-align: center; background-color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; position: relative; }
        .image-box h2 { margin-top: 0; }
        img { height: 600px; width: 450px; object-fit: contain; display: block; }
        #controls { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 30px; }
        #prompt-area { width: 50vw; height: 60px; padding: 8px; font-size: 1em; border-radius: 5px; border: 1px solid #ccc; }
        #nav { display: flex; gap: 15px; align-items: center; }
        button { font-size: 1.2em; padding: 10px 20px; cursor: pointer; border-radius: 5px; border: none; color: white; }
        .loader { position: absolute; top: 50%; left: 50%; border: 8px solid #f3f3f3; border-top: 8px solid #3498db; border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite; margin-left: -30px; margin-top: -30px; display: none; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <h1>Image Comparison</h1>
    <div id="status"></div>
    <div id="filename-container"></div>
    <div id="container">
        <div class="image-box"><h2>Original</h2><img id="img-original"></div>
        <div class="image-box"><h2>Enhanced</h2><img id="img-enhanced"><div class="loader"></div></div>
    </div>
    <div id="controls">
        <textarea id="prompt-area" placeholder="Add additional instructions for regeneration... e.g., 'make the background pure white'"></textarea>
        <div id="nav">
            <button id="copy-btn" style="background-color: #ffc107;">Copy to Original</button>
            <button id="prev-btn" style="background-color: #6c757d;">&larr; Previous</button>
            <button id="next-btn" style="background-color: #007bff;">Next &rarr;</button>
            <button id="regen-btn" style="background-color: #28a745;">Regenerate</button>
        </div>
    </div>
    <script>
        let images = [], currentIndex = 0;
        const originalImg = document.getElementById('img-original');
        const enhancedImg = document.getElementById('img-enhanced');
        const filenameEl = document.getElementById('filename-container');
        const statusEl = document.getElementById('status');
        const loader = document.querySelector('.loader');
        const promptArea = document.getElementById('prompt-area');

        function showImage(index) {
            if (images.length === 0) return;
            const filename = images[index];
            originalImg.src = '/shop/' + filename + '?t=' + new Date().getTime();
            enhancedImg.src = '/shop_enhanced/' + filename + '?t=' + new Date().getTime();
            filenameEl.textContent = filename;
            statusEl.textContent = `${index + 1} of ${images.length}`;
        }

        async function handleApiRequest(endpoint, body, action) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(body)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || `${action} failed`);
                }
                const data = await response.json();
                console.log(`${action} successful:`, data.message);
                showImage(currentIndex);
            } catch (error) {
                console.error(`Error during ${action}:`, error);
                alert(`Error during ${action}: ${error.message}`);
            } finally {
                loader.style.display = 'none';
            }
        }

        document.getElementById('copy-btn').addEventListener('click', () => {
            if (images.length === 0) return;
            handleApiRequest('/api/copy', { filename: images[currentIndex] }, 'Copy');
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            if (images.length === 0) return;
            currentIndex = (currentIndex + 1) % images.length;
            showImage(currentIndex);
        });
        
        document.getElementById('prev-btn').addEventListener('click', () => {
            if (images.length === 0) return;
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            showImage(currentIndex);
        });

        document.getElementById('regen-btn').addEventListener('click', () => {
            if (images.length === 0) return;
            loader.style.display = 'block';
            handleApiRequest('/api/regenerate', { 
                filename: images[currentIndex], 
                prompt: promptArea.value 
            }, 'Regeneration');
        });

        fetch('/api/images').then(res => res.json()).then(data => {
            images = data;
            if (images.length > 0) showImage(0);
            else document.body.innerHTML = '<h1>No differing images found!</h1>';
        });
    </script>
</body>
</html>
    """

if __name__ == "__main__":
    # Note: Running with reload=True is great for development.
    # Uvicorn needs the app location as a string in this format: "filename:appname"
    uvicorn.run("comparator_server:app", host="0.0.0.0", port=8000, reload=True)