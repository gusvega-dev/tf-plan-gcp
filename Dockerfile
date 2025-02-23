FROM node:20-slim

# Set environment variables to prevent user interaction during package installation
ENV DEBIAN_FRONTEND=noninteractive 

# Update package lists and install required dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends wget unzip && \
    rm -rf /var/lib/apt/lists/*

# Set working directory inside the container
WORKDIR /app

# Copy action files
COPY . /app

# Install Node.js dependencies
RUN npm install

# Set entrypoint to run index.js
ENTRYPOINT ["node", "/app/index.js"]
