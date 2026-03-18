# Tesseract-OCR Setup Guide

## Windows Installation

To enable the subject detection feature from timetable images, you need to install the Tesseract-OCR binary.

### Option 1: Download Installer (Recommended)
1. Download the Windows installer from:
   https://github.com/UB-Mannheim/tesseract/wiki

2. Look for the latest version (e.g., `tesseract-ocr-w64-setup-v5.x.x.exe`)

3. Run the installer and install it to the default location:
   `C:\Program Files\Tesseract-OCR`

4. During installation, make sure to install language data. At minimum, select "English".

5. After installation, restart your Flask backend by running:
   ```powershell
   python backend/app.py
   ```

### Option 2: Using Chocolatey (if installed)
```powershell
choco install tesseract
```

### Option 3: Using Windows Package Manager
```powershell
winget install UB-Mannheim.TesseractOCR
```

### Verify Installation

After installation, verify that Tesseract is working:

```powershell
tesseract --version
```

You should see version information output.

## How Subject Detection Works

1. User uploads a timetable image on the Timetable Setup page (Step 2)
2. The image is sent to the Flask backend (`/detect-subjects` endpoint)
3. Tesseract OCR extracts all text from the image
4. The backend processes and filters the text to identify subject names
5. Detected subjects are displayed in a confirmation dialog
6. User can review, add missing subjects manually, or remove incorrect detections
7. User confirms and saves the subjects

## Troubleshooting

### "tesseract is not installed" error
- Verify Tesseract is installed: `tesseract --version`
- Check installation path matches the path in `backend/app.py`
- Try reinstalling Tesseract to the default location

### Poor subject detection
- Ensure the timetable image is clear and well-lit
- Try uploading a clearer image or screenshot
- Subjects should be clearly visible and in standard fonts
- Manual entry of subjects is always an option

### "PIL cannot open image" error
- Ensure the uploaded file is a valid image format (PNG, JPG, JPEG, GIF, BMP)
- Check file size is not corrupted

