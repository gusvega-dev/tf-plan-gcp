FROM node:20-bullseye

# Install system dependencies (wget, unzip, and Terraform dependencies)
RUN apt-get update && apt-get install -y wget unzip

# Set working directory inside the container
WORKDIR /app

# Copy action files
COPY . /app

# Install Node.js dependencies
RUN npm install

# Set entrypoint to run index.js
ENTRYPOINT ["node", "/app/index.js"]
