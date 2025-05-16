#!/bin/bash

# Domain setup script for ethicalowl.xyz
echo "Setting up ethicalowl.xyz domain..."

# 1. Update environment variables
cat << 'EOL' > .env.production
# Database Configuration
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=eva
DB_PORT=5432

# Frontend Configuration
FRONTEND_PORT=80
VITE_API_URL=/api
VITE_AGENT_URL=/agent
VITE_BACKEND_URL=/api

# Backend Configuration
BACKEND_PORT=8443
SERVER_PORT=8443
CORS_ALLOWED_ORIGINS=http://ethicalowl.xyz,https://ethicalowl.xyz,http://www.ethicalowl.xyz,https://www.ethicalowl.xyz

# Agent Configuration
AGENT_PORT=5001
OPENAI_API_KEY=${OPENAI_API_KEY}
AI_AGENT_URL=http://agent:5001
LOG_LEVEL=info

# JWT Configuration
JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 64)}
JWT_EXPIRATION_MS=604800000

# OAuth Configuration
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}

# Email Configuration
MAIL_HOST=${MAIL_HOST}
MAIL_PORT=${MAIL_PORT}
MAIL_USERNAME=${MAIL_USERNAME}
MAIL_PASSWORD=${MAIL_PASSWORD}
MAIL_DEBUG=false

# Deployment URLs
DEPLOYED_FRONTEND_URL=http://ethicalowl.xyz
FRONTEND_URL=http://ethicalowl.xyz
EOL

echo "Created .env.production file"

# 2. Deploy to the server
echo "Now deploying to server..."

# Generate a command to copy files to the server
echo "Run the following commands to deploy:"
echo "------------------------------------"
echo "scp -r . root@188.245.65.196:/home/eva_deployer/thesis"
echo "ssh root@188.245.65.196"
echo "cd /home/eva_deployer/thesis"
echo "mv .env.production .env"
echo "docker-compose down"
echo "docker-compose up -d"
echo "------------------------------------"

echo "After deployment, set up DNS at Namecheap:"
echo "1. Log in to your Namecheap account"
echo "2. Go to Domain List and click 'Manage' for ethicalowl.xyz" 
echo "3. Navigate to 'Advanced DNS'"
echo "4. Add an A Record:"
echo "   - Host: @ (or leave empty)"
echo "   - Value: 188.245.65.196"
echo "   - TTL: Automatic"
echo "5. Add another A Record for 'www' pointing to the same IP"
echo ""
echo "It may take a few hours for DNS changes to propagate."

# Optional: Set up Let's Encrypt SSL certificate
echo "To set up HTTPS with Let's Encrypt, run the following on the server:"
echo "apt-get update"
echo "apt-get install -y certbot"
echo "certbot certonly --standalone -d ethicalowl.xyz -d www.ethicalowl.xyz"
echo "# Then update nginx.conf to use the SSL certificates" 