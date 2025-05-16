# Use multi-stage build for smaller final image
FROM python:3.12-slim as builder

# Set working directory
WORKDIR /app

# Install system dependencies including Fortran compiler
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    git \
    gfortran \
    libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Second stage
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy only necessary files from builder
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
ENV PORT=8000

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
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5001", "--reload"]