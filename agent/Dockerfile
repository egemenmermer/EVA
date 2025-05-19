# Use a base image with Python 3.12
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    wget \
    libxml2-dev \
    libxslt-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements.txt
COPY requirements.txt .

# Install Python dependencies
# Exclude comment lines and empty lines
RUN grep -v "^#\|^$\\|numpy\|scipy\|pillow\|lxml\|regex" requirements.txt > filtered_requirements.txt && \
    pip install --no-cache-dir -r filtered_requirements.txt

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p /app/data/stored_vectors
RUN mkdir -p /app/data/embeddings
RUN mkdir -p /app/data/documents
RUN mkdir -p /app/data/processed
RUN mkdir -p /app/logs

# Set environment variables
ENV PYTHONPATH=/app

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]