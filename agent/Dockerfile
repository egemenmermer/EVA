# Use a base image with Python 3.12
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements.txt first (for better caching)
COPY requirements.txt .

# Install core numeric packages first
RUN pip install --no-cache-dir numpy==1.26.4 scipy==1.13.0

# Install FAISS from PyPI for ARM64
RUN pip install --no-cache-dir faiss-cpu==1.7.3

# Install remaining dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p /app/data/stored_vectors
RUN mkdir -p /app/data/embeddings
RUN mkdir -p /app/data/documents
RUN mkdir -p /app/logs

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    REDIS_URL=redis://redis:6379/0

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl --fail http://localhost:5001/health || exit 1

# Command to run on container start
CMD ["uvicorn", "main_wrapper:app", "--host", "0.0.0.0", "--port", "5001"]