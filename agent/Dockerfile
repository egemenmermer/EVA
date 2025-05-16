# Use multi-stage build for smaller final image
FROM python:3.12-slim as builder

# Set working directory
WORKDIR /app

# Install system dependencies including Fortran compiler and other required libraries
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    git \
    gfortran \
    libopenblas-dev \
    pkg-config \
    swig \
    && rm -rf /var/lib/apt/lists/*

# Install pip and upgrade it
RUN pip install --no-cache-dir --upgrade pip wheel setuptools

# Copy requirements.txt
COPY requirements.txt .

# Install scientific packages first
RUN pip install --no-cache-dir --prefer-binary --only-binary=:all: numpy==1.26.4 scipy==1.13.0 

# Install scikit-learn, which can be an alternative to faiss on ARM
RUN pip install --no-cache-dir --prefer-binary scikit-learn==1.3.2

# Install the rest of requirements, ignoring errors for faiss-cpu on ARM
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt || echo "Some packages may have failed to install, continuing anyway"

# Second stage for smaller final image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install only runtime dependencies needed for the application
RUN apt-get update && apt-get install -y \
    curl \
    libopenblas0 \
    && rm -rf /var/lib/apt/lists/*

# Copy Python environment from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /var/scratch/xuv668/model_cache \
    && mkdir -p /var/log/ethical-ai \
    && mkdir -p /app/logs \
    && mkdir -p data/raw/guidelines \
    && mkdir -p data/raw/case_studies \
    && mkdir -p data/processed

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=5001

# Set up logging
RUN touch /var/log/ethical-ai/app.log \
    && touch /var/log/ethical-ai/access.log \
    && touch /var/log/ethical-ai/error.log

# Create non-root user
RUN useradd -m -u 1000 appuser \
    && chown -R appuser:appuser /app \
    && chown -R appuser:appuser /var/scratch \
    && chown -R appuser:appuser /var/log/ethical-ai

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5001

# Health check with increased tolerance for startup
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:5001/health || exit 1

# Start application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5001"]