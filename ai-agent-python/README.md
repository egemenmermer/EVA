# Ethical AI Decision-Making Assistant

An AI-powered system that provides ethical guidance for software development decisions, leveraging the Llama-2 model and a comprehensive database of ethical guidelines and case studies.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Cache Management](#cache-management)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)

## Prerequisites

- Python 3.8 or higher
- CUDA-capable GPU (recommended for faster processing)
- 16GB RAM minimum
- 50GB disk space for models and cache

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/vu-thesis.git
cd vu-thesis
```

2. Create and activate a virtual environment:
```bash
python -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API tokens and configuration
```

## Cache Management

The system uses a caching mechanism to improve performance. Cache files are stored locally and not tracked by Git.

### Cache Structure
```
cache/
├── embeddings/          # Embedding model cache
├── retriever/           # Document embeddings and index
│   ├── embeddings.npy   # Cached document embeddings
│   └── documents.json   # Cached document metadata
└── sentence-transformers_*/ # Transformer model files
```

### First Run
- On first run, the system will:
  1. Download the sentence transformer model
  2. Generate document embeddings
  3. Cache everything locally

### Subsequent Runs
- The system will use cached files if available
- New embeddings are generated only if documents change
- Cache is system-specific and optimized for local hardware

### Cache Locations
- Default: `./cache/`
- DAS-6: `/var/scratch/$USER/cache/`
- Can be configured via `CACHE_DIR` in `.env`

### Managing Cache
- Clear cache if you update documents:
```bash
rm -rf cache/retriever/*  # Clear only embeddings
rm -rf cache/*            # Clear all cache
```

## Usage

1. Start the agent:
```bash
python scripts/run_agent.py
```

2. Process new documents:
```bash
python scripts/process_pdfs.py
```

3. Run the API server:
```bash
uvicorn app:app --reload
```

## Project Structure

```
.
├── agents/             # Agent implementations
├── data/              # Data storage
│   ├── raw/           # Raw PDF documents
│   └── processed/     # Processed documents
├── data_processing/   # Data processing utilities
├── embeddings/        # Embedding models
├── models/            # Language models
├── retriever/         # Search and retrieval
└── tests/            # Test suite
```

## Development

### Code Style
- Follow PEP 8
- Use type hints
- Document all functions and classes

### Git Workflow
1. Create feature branch
2. Make changes
3. Run tests
4. Submit pull request

### Important Notes
- Don't commit cache files
- Keep PDF files in data/raw
- Update requirements.txt when adding dependencies

## Testing

Run tests:
```bash
pytest
```

Run with coverage:
```bash
pytest --cov=.
```

## DAS-6 Specific Setup

⚠️ **IMPORTANT:** Programs MUST be run on compute nodes, NEVER on headnodes. Running on headnodes violates DAS-6 usage policy and affects other users.

1. Load required modules:
```bash
module load python/3.8.2
module load cuda/11.8
```

2. Set cache directory:
```bash
export CACHE_DIR=/var/scratch/$USER/cache
```

3. Submit job to compute node:
```bash
# Create job script
cat > run_agent.sh << 'EOL'
#!/bin/bash
#$ -N ethical_ai
#$ -l h_rt=24:00:00
#$ -l gpu=1
#$ -l h_vmem=32G
#$ -cwd

# Load modules
module load python/3.8.2
module load cuda/11.8

# Activate virtual environment
source env/bin/activate

# Set cache directory
export CACHE_DIR=/var/scratch/$USER/cache

# Run the agent
python scripts/run_agent.py --use-gpu
EOL

# Submit job
qsub run_agent.sh
```

4. Monitor job status:
```bash
qstat  # Check job status
qstat -j job_id  # Detailed job info
```

For more information about DAS-6 usage policy, visit:
https://www.cs.vu.nl/das6/usage.shtml

## Troubleshooting

### Common Issues

1. Cache Generation Errors
```bash
# Clear problematic cache
rm -rf cache/retriever/*
# Retry with logging
python scripts/run_agent.py --debug
```

2. GPU Memory Issues
```bash
# Reduce batch size
python scripts/run_agent.py --batch-size 16
```

3. Missing Cache Directory
```bash
# Create necessary directories
mkdir -p cache/retriever cache/embeddings
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Submit pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Author:** [Your Name]  
**Affiliation:** Vrije Universiteit Amsterdam  
**Contact:** [Your email or professional website]
