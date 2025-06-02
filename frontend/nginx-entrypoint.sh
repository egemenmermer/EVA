#!/bin/sh

# Check if SSL certificates exist
if [ -f "/etc/letsencrypt/live/ethicalowl.xyz/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/ethicalowl.xyz/privkey.pem" ]; then
    echo "SSL certificates found, configuring HTTPS..."
    
    # Create SSL configuration
    cat > /etc/nginx/conf.d/default.conf <<EOF
    server {
        listen 80;
        server_name ethicalowl.xyz www.ethicalowl.xyz;
        
        # Redirect all HTTP traffic to HTTPS
        return 301 https://\$host\$request_uri;
    }

    server {
        listen 443 ssl;
        server_name ethicalowl.xyz www.ethicalowl.xyz;

        ssl_certificate /etc/letsencrypt/live/ethicalowl.xyz/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/ethicalowl.xyz/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:10m;

        root /usr/share/nginx/html;
        index index.html index.htm;

        # For React Router or any SPA routing
        location / {
            try_files \$uri \$uri/ /index.html;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }

        # Proxy API requests to backend
        location /api/ {
            proxy_pass http://backend:8443/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_pass_request_headers on;
        }

        # Proxy debug requests to backend
        location /debug/ {
            proxy_pass http://backend:8443/debug/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_pass_request_headers on;
        }

        # Proxy agent requests
        location /agent/ {
            proxy_pass http://agent:8000/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # Static assets caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 30d;
            add_header Cache-Control "public, no-transform";
        }

        # Error pages
        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            root /usr/share/nginx/html;
        }
    }
EOF
else
    echo "SSL certificates not found, using HTTP only configuration..."
    # Use the default HTTP-only configuration that was copied during the build
fi

# Start nginx
exec nginx -g 'daemon off;' 