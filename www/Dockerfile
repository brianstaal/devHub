# Use light and secure alpine node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package dependencies
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application files
COPY server.js ./
COPY public/ ./public/

# Expose port
EXPOSE 2999

# Create data directory and define as volume for external mapping
RUN mkdir -p /app/data
VOLUME /app/data

# Run application
CMD ["npm", "start"]
