# Use light and secure alpine node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package dependencies from www folder to /app inside image
COPY www/package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application files from www folder to /app inside image
COPY www/server.js ./
COPY www/public/ ./public/

# Expose port
EXPOSE 2999

# Create data directory outside of application folder and define as volume for external mapping
RUN mkdir -p /data
VOLUME /data

# Define environment variable default for storage path
ENV DATA_DIR=/data

# Run application
CMD ["npm", "start"]
