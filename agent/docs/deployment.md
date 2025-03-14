# Deployment Guide

This guide provides detailed instructions for deploying the Ethical Decision-Making API in various environments.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Monitoring](#monitoring)
- [Security Considerations](#security-considerations)

## Prerequisites

### System Requirements
- Python 3.8 or higher
- PostgreSQL 12 or higher
- 8GB RAM minimum (16GB recommended)
- 20GB disk space for models and cache

### API Keys and Credentials
- Hugging Face API token
- Database credentials
- (Optional) Slack integration tokens
- (Optional) Jira integration credentials

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ethical-ai.git
cd ethical-ai
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

5. Run the development server:
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

## Docker Deployment

1. Build the Docker image:
```bash
docker build -t ethical-ai .
```

2. Run the container:
```bash
docker run -d \
  --name ethical-ai \
  -p 8000:8000 \
  --env-file .env \
  -v /path/to/cache:/var/scratch/xuv668/model_cache \
  ethical-ai
```

3. Check container logs:
```bash
docker logs -f ethical-ai
```

## Cloud Deployment

### AWS Deployment

1. Set up AWS credentials and configure CLI
2. Create ECR repository:
```bash
aws ecr create-repository --repository-name ethical-ai
```

3. Push Docker image:
```bash
aws ecr get-login-password --region region | docker login --username AWS --password-stdin account.dkr.ecr.region.amazonaws.com
docker tag ethical-ai:latest account.dkr.ecr.region.amazonaws.com/ethical-ai:latest
docker push account.dkr.ecr.region.amazonaws.com/ethical-ai:latest
```

4. Deploy using ECS or EKS (sample templates in `deployment/aws/`)

### Google Cloud Platform

1. Set up GCP credentials
2. Enable required APIs
3. Deploy to Cloud Run:
```bash
gcloud run deploy ethical-ai \
  --image gcr.io/project-id/ethical-ai \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Environment Configuration

Required environment variables:
```
# Model and API tokens
HUGGINGFACE_TOKEN=your_token_here
CACHE_DIR=/path/to/cache

# Database configuration
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_db
POSTGRES_HOST=your_host
POSTGRES_PORT=5432
POSTGRES_SSL_MODE=require

# Optional integrations
SLACK_BOT_TOKEN=your_token
JIRA_API_TOKEN=your_token
```

## Database Setup

1. Create database:
```sql
CREATE DATABASE ethical_ai;
```

2. Run migrations:
```bash
alembic upgrade head
```

3. Set up backup schedule:
```bash
# Add to crontab
0 0 * * * /path/to/backup_script.sh
```

## Monitoring

### Health Checks
- API endpoint: `/health`
- Database connection check
- Model availability check

### Metrics
- Request latency
- Success/error rates
- Model inference time
- Memory usage
- Database connection pool

### Logging
- Application logs: `/var/log/ethical-ai/app.log`
- Access logs: `/var/log/ethical-ai/access.log`
- Error logs: `/var/log/ethical-ai/error.log`

## Security Considerations

1. API Security:
   - Use HTTPS only
   - Implement rate limiting
   - Add API key authentication
   - Enable CORS with specific origins

2. Data Security:
   - Encrypt sensitive data
   - Regular security audits
   - Access control policies
   - Data retention policies

3. Infrastructure Security:
   - Network isolation
   - Regular updates
   - Security group configuration
   - VPC setup

4. Compliance:
   - GDPR considerations
   - Data privacy regulations
   - Ethical guidelines compliance
   - Audit logging

## Troubleshooting

Common issues and solutions:

1. Memory Issues:
```bash
# Increase swap space
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

2. Database Connection Issues:
```bash
# Check connection
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB
```

3. Model Loading Issues:
```bash
# Clear cache
rm -rf /path/to/cache/*
# Verify permissions
chmod -R 755 /path/to/cache
```

## Support

For additional support:
- GitHub Issues: [Create an issue](https://github.com/yourusername/ethical-ai/issues)
- Documentation: [View full documentation](docs/README.md)
- Contact: support@example.com 