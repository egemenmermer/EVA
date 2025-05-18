# Use multi-stage build for smaller final image
FROM python:3.12-slim as builder

# Set working directory
WORKDIR /app

# Install system dependencies for building FAISS and other packages
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    git \
    gfortran \
    libopenblas-dev \
    pkg-config \
    swig \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Install pip and upgrade it
RUN pip install --no-cache-dir --upgrade pip wheel setuptools

# Copy requirements.txt
COPY requirements.txt .

# Install NumPy and SciPy first
RUN pip install --no-cache-dir --prefer-binary numpy==1.26.4 scipy==1.13.0

# Install FAISS via pip with binaries (use a specific version known to work on ARM64)
RUN pip install --no-cache-dir faiss-cpu==1.7.3

# Install other requirements (excluding faiss-cpu which is installed above)
RUN grep -v "faiss-cpu" requirements.txt > temp_requirements.txt && \
    pip install --no-cache-dir -r temp_requirements.txt && \
    rm temp_requirements.txt

# Create smaller final image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install required system libraries
RUN apt-get update && apt-get install -y \
    libopenblas-base \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder stage
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

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