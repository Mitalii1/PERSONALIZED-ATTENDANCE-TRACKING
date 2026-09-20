FROM python:3.12-slim

WORKDIR /app

# Copy requirements first so dependency layers are cached between code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
EXPOSE 5000

# Gunicorn, not `python app.py`. The Flask development server prints a warning
# about not being a production server for a reason.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "app:app"]
