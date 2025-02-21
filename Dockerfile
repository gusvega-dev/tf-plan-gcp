# Use a lightweight Node.js image
FROM node:18-alpine

# Install Terraform
RUN apk add --no-cache terraform

# Set up the working directory
WORKDIR /app

# Copy action files
COPY entrypoint.sh /entrypoint.sh
COPY index.js /app/index.js
COPY package.json package-lock.json /app/

# Install Node.js dependencies
RUN npm install --production

# Make the entrypoint executable
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
