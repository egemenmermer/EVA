# Stage 1: Build the React application
FROM node:18-alpine AS build
WORKDIR /app
# Copy package files and install dependencies
# Use --frozen-lockfile for reproducible installs if package-lock.json is reliable
COPY package.json package-lock.json* ./
RUN npm install
# Copy the rest of the application code
COPY . .
# Set build-time environment variables (passed via 'args' in docker-compose)
ARG VITE_API_URL
ARG VITE_AGENT_URL
ARG VITE_BACKEND_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GITHUB_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AGENT_URL=$VITE_AGENT_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GITHUB_CLIENT_ID=$VITE_GITHUB_CLIENT_ID

# Build the application (Vite typically uses 'build')
RUN npm run build

# Stage 2: Serve the static files using Nginx
FROM nginx:1.25-alpine
# Copy the build output from the build stage to Nginx's web root
COPY --from=build /app/dist /usr/share/nginx/html
# Copy custom Nginx configuration (fallback for HTTP-only mode)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy our custom entrypoint script
COPY nginx-entrypoint.sh /nginx-entrypoint.sh
# Make the entrypoint script executable
RUN chmod +x /nginx-entrypoint.sh
# Expose ports 80 and 443
EXPOSE 80 443
# Use our custom entrypoint script
ENTRYPOINT ["/nginx-entrypoint.sh"] 