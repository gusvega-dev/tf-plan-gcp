FROM node:20

# Install system dependencies
RUN apt-get update && apt-get install -y wget unzip

# Set working directory inside the container
WORKDIR /app

# Copy files
COPY . /app

# Install dependencies
RUN npm install

# Set entrypoint to run index.js
ENTRYPOINT ["node", "index.js"]
