import google.generativeai as genai
from PIL import Image
import io

# Configure Gemini API
genai.configure(api_key="AIzaSyB1N6R1zXtG6wr9wte9NaCsfrZewNi0fKQ")
model = genai.GenerativeModel("gemini-1.5-flash")

def detect_subjects_from_timetable(image_data):
    """
    Detect subjects from a timetable image using Gemini API
    
    Args:
        image_data: Image file object or path to image
    
    Returns:
        List of detected subjects
    """
    try:
        # Load image
        if isinstance(image_data, str):
            # If it's a file path
            img = Image.open(image_data)
        else:
            # If it's a file object from frontend
            img = Image.open(io.BytesIO(image_data.read()))
        
        # Send to Gemini for analysis
        response = model.generate_content([
            "Extract only the subject/course names from this timetable image. Return as a simple list, one subject per line. Do not include times, days, or other information.",
            img
        ])
        
        # Parse the response to get subjects
        subjects_text = response.text
        subjects = [s.strip() for s in subjects_text.split('\n') if s.strip()]
        
        # Display in terminal
        print("=" * 50)
        print("DETECTED SUBJECTS FROM TIMETABLE:")
        print("=" * 50)
        for i, subject in enumerate(subjects, 1):
            print(f"{i}. {subject}")
        print("=" * 50)
        
        return subjects
        
    except Exception as e:
        print(f"Error detecting subjects: {str(e)}")
        return []


# For testing with a local image
if __name__ == "__main__":
    try:
        # Test with local timetable.jpg if it exists
        subjects = detect_subjects_from_timetable("timetable.jpg")
        print(f"\nTotal subjects found: {len(subjects)}")
    except FileNotFoundError:
        print("timetable.jpg not found. Please upload an image through the frontend.")
