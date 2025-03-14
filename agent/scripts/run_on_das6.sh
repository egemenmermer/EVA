#!/bin/bash

#$ -N ethical_ai_processing
#$ -l h_rt=24:00:00
#$ -l gpu=4
#$ -l h_vmem=256G
#$ -cwd

# Load system modules first
module purge
module load gcc/11.2.0
module load python/3.8.2
module load cuda/11.8
module load cudnn/8.6.0-cuda11.8
module load openmpi/4.1.1
module load eth/0.1

# Verify CUDA setup
echo "Checking CUDA installation..."
nvcc --version
nvidia-smi

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate

# Upgrade pip and install dependencies
pip install --upgrade pip setuptools wheel
pip install torch==1.10.1+cu113 -f https://download.pytorch.org/whl/cu113/torch_stable.html
pip install -r requirements.txt

# Set environment variables
export PYTHONPATH=$PWD
export CUDA_HOME=/usr/local/cuda-11.8
export PATH=$CUDA_HOME/bin:$PATH
export LD_LIBRARY_PATH=$CUDA_HOME/lib64:$LD_LIBRARY_PATH
export CUDA_VISIBLE_DEVICES=0,1,2,3
export CUDA_LAUNCH_BLOCKING=0
export TOKENIZERS_PARALLELISM=true
export TORCH_DISTRIBUTED_DEBUG=INFO
export OMP_NUM_THREADS=32
export MKL_NUM_THREADS=32

# Configure PyTorch settings
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:128
export PYTORCH_JIT=1
export TORCH_USE_CUDA_DSA=1

# Configure CUDA memory settings
export CUDA_MEMORY_FRACTION=0.95
export CUDA_MAX_WORKSPACE_SIZE_MB=4096
export CUDA_CACHE_PATH="$PWD/cache/cuda"
export CUDA_CACHE_MAXSIZE=2147483648  # 2GB cache size

# Create necessary directories
mkdir -p data/raw/guidelines
mkdir -p data/raw/case_studies
mkdir -p data/processed
mkdir -p cache/cuda
mkdir -p logs
mkdir -p ethics_index

# Print system information
echo "=== System Information ==="
echo "Python version:"
python --version
echo "PyTorch version and CUDA availability:"
python -c "import torch; print(f'PyTorch {torch.__version__}, CUDA available: {torch.cuda.is_available()}, Device count: {torch.cuda.device_count()}')"
echo "CUDA version:"
nvcc --version
echo "GPU information:"
nvidia-smi
echo "Memory Information:"
free -h
echo "CPU Information:"
lscpu
echo "CUDA Configuration:"
nvidia-smi -q
echo "======================="

# Run the data processing script with optimized settings
python scripts/process_data.py \
    --data-dir data \
    --cache-dir cache \
    --index-dir ethics_index \
    --chunk-size 512 \
    --overlap 64 \
    --force \
    2>&1 | tee logs/processing.log 