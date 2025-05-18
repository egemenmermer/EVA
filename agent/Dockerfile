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

# Install Miniconda
RUN wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-aarch64.sh -O /tmp/miniconda.sh \
    && bash /tmp/miniconda.sh -b -p /opt/conda \
    && rm /tmp/miniconda.sh

# Add conda to path
ENV PATH /opt/conda/bin:$PATH

# Create a conda environment and install dependencies
RUN conda create -n faiss_env python=3.12 -y \
    && conda install -n faiss_env -c conda-forge \
    faiss \
    numpy=1.26.4 \
    scipy=1.13.0 \
    pillow=10.1.0 \
    lxml \
    regex \
    -y

# Copy requirements.txt
COPY requirements.txt .

# Install Python dependencies, skip those installed by conda
# Exclude comment lines and empty lines
RUN grep -v "^#\|^$\|faiss\|numpy\|scipy\|pillow\|lxml\|regex" requirements.txt > filtered_requirements.txt && \
    pip install --no-cache-dir -r filtered_requirements.txt

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p /app/data/stored_vectors
RUN mkdir -p /app/data/embeddings
RUN mkdir -p /app/data/documents
RUN mkdir -p /app/data/processed

# Set environment variables
ENV PYTHONPATH=/app
ENV PATH /opt/conda/envs/faiss_env/bin:$PATH
ENV LD_LIBRARY_PATH /opt/conda/envs/faiss_env/lib:$LD_LIBRARY_PATH

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]