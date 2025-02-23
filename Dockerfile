# Use Ubuntu as the base image
FROM ubuntu:20.04

# Install system dependencies (including Node.js, npm, sudo, wget, and unzip)
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    sudo \
    wget \
    unzip

# Set working directory inside the container
WORKDIR /app

# Copy action files
COPY . /app

# Install Node.js dependencies
RUN npm install

# Set entrypoint to run index.js
ENTRYPOINT ["node", "/app/index.js"]
