# Base image
FROM node:20

# Set non-interactive mode
ENV DEBIAN_FRONTEND=noninteractive 
ENV TF_PLUGIN_CACHE_DIR=/root/.terraform.d/plugin-cache

# Install Terraform
RUN apt-get update && \
    apt-get install -y wget unzip && \
    wget -q https://releases.hashicorp.com/terraform/1.5.6/terraform_1.5.6_linux_amd64.zip && \
    unzip terraform_1.5.6_linux_amd64.zip && \
    mv terraform /usr/local/bin/terraform && \
    chmod +x /usr/local/bin/terraform && \
    mkdir -p /root/.terraform.d/plugin-cache && \
    rm -rf /var/lib/apt/lists/* terraform_1.5.6_linux_amd64.zip

# Set working directory
WORKDIR /github/workspace

# Copy action files
COPY . /app
WORKDIR /app

# Install Node.js dependencies and enable npm cache
RUN npm install && \
    npm config set cache /root/.npm

# Entry point with caching enabled
ENTRYPOINT ["sh", "-c", "exec node /app/index.js > /proc/1/fd/1 2>/proc/1/fd/2"]