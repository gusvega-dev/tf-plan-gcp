FROM node:20

# Set working directory
WORKDIR /app

# Copy action files
COPY . /app

# Install Node.js dependencies
RUN npm install

# Set entrypoint to run index.js
ENTRYPOINT ["node", "/app/index.js"]
