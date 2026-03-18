from flask import Flask, request, jsonify
from flask_cors import CORS
import pytesseract
from PIL import Image
import io
import re
from werkzeug.utils import secure_filename
import os

# Configure pytesseract path for Windows
# If Tesseract is installed in default location, it should auto-detect
# If not found, try common installation paths
if os.name == 'nt':  # Windows
    try:
        pytesseract.pytesseract.pytesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    except:
        pass

app = Flask(__name__)
CORS(app)

# In-memory user storage (no database)
users = {}

@app.route("/")
def home():
    return "Attendance Backend Running"


# SIGNUP API
@app.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.json
        # Just accept the data and return success - no validation, no storage
        return jsonify({"message": "Account created successfully!"}), 201
    except Exception as e:
        return jsonify({"message": f"Error: {str(e)}"}), 500


# LOGIN API
@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.json
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()

        if not email or not password:
            return jsonify({"message": "Email and password required"}), 400

        # Check user in memory
        if email in users and users[email]["password"] == password:
            return jsonify({"message": "Login successful", "user": users[email]}), 200
        else:
            return jsonify({"message": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"message": f"Error: {str(e)}"}), 500


# DETECT SUBJECTS FROM TIMETABLE IMAGE
@app.route("/detect-subjects", methods=["POST"])
def detect_subjects():
    try:
        # Check if image file is in the request
        if 'file' not in request.files:
            return jsonify({"message": "No file provided"}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({"message": "No file selected"}), 400
        
        # Check file extension
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({"message": "Invalid file format. Please upload an image."}), 400
        
        # Read image from request
        img = Image.open(io.BytesIO(file.read()))
        
        # Enhance image for better OCR (optional: resize if too small)
        img_width, img_height = img.size
        if img_width < 400 or img_height < 400:
            scale_factor = max(400 / img_width, 400 / img_height)
            new_size = (int(img_width * scale_factor), int(img_height * scale_factor))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # Extract text using pytesseract
        extracted_text = pytesseract.image_to_string(img)
        
        if not extracted_text.strip():
            return jsonify({
                "message": "No text detected in image",
                "subjects": []
            }), 200
        
        # Parse subjects from extracted text
        # Common patterns: each line could be a subject or time slot
        lines = extracted_text.split('\n')
        subjects = []
        
        # Filter out common timetable headers and noise
        common_headers = ['time', 'day', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 
                         'saturday', 'sunday', 'period', 'slot', 'am', 'pm', 'period', ':']
        
        for line in lines:
            cleaned_line = line.strip().lower()
            
            # Skip empty lines and very short text
            if len(cleaned_line) < 3:
                continue
            
            # Skip lines that are just numbers or common headers
            if cleaned_line.isdigit() or any(header in cleaned_line for header in common_headers):
                continue
            
            # Skip lines with mostly special characters
            if sum(1 for c in cleaned_line if c.isalpha()) < len(cleaned_line) * 0.5:
                continue
            
            # Clean up the subject name
            subject = line.strip()
            subject = re.sub(r'[0-9\-\/:\.]+', '', subject).strip()
            
            if subject and len(subject) >= 3 and subject not in subjects:
                subjects.append(subject)
        
        return jsonify({
            "message": "Subjects detected successfully",
            "subjects": subjects[:20]  # Limit to 20 subjects
        }), 200
    
    except Exception as e:
        return jsonify({"message": f"Error processing image: {str(e)}", "subjects": []}), 500


if __name__ == "__main__":
    app.run(debug=True)