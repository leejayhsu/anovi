FROM node:20-slim

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Create data directory (will be bind mounted, but ensure it exists)
RUN mkdir -p /app/data

# Expose port (SvelteKit default is 3000 for production)
EXPOSE 3000

# Start the app using the built output
CMD ["node", "build/index.js"]


