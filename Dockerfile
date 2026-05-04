# Stage 1: Build Web Artifacts
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Copy the rest of the app source code
COPY . .

# Export the web project
# Using -p web to specify platform web
RUN npx expo export -p web

# Stage 2: Serve via Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
