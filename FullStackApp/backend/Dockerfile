FROM python:3.11-slim

# Install libmagic (required by python-magic for MIME detection in security_scanner.py)
# and other system dependencies.
RUN apt-get update && apt-get install -y \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /backend

# Install Python dependencies first (layer caching — only re-runs when requirements change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy language model (required by ResumeModel preprocessing)
RUN python -m spacy download en_core_web_sm

# Copy the backend source code
COPY . .

# Copy the ML model artifacts from the parent directory into the container.
# These are referenced by predict.py relative to the backend root.
# Note: model.pkl/tfidf.pkl/encoder.pkl live in FullStackApp/ (root level),
# and v5/, v6/ subdirs are also in FullStackApp/.
# The docker-compose volume mounts handle this at runtime.

EXPOSE 8000

# Start the FastAPI server.
# Use --host 0.0.0.0 so it's reachable from outside the container.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
