FROM node:20

# Set non-interactive mode to prevent installation prompts
ENV DEBIAN_FRONTEND=noninteractive 

# Install required system dependencies and Terraform
RUN apt-get update && \
    apt-get install -y wget unzip && \
    wget -q https://releases.hashicorp.com/terraform/1.5.6/terraform_1.5.6_linux_amd64.zip && \
    unzip terraform_1.5.6_linux_amd64.zip && \
    mv terraform /usr/local/bin/terraform && \
    chmod +x /usr/local/bin/terraform && \
    rm -rf /var/lib/apt/lists/* terraform_1.5.6_linux_amd64.zip

# Set working directory inside the container
WORKDIR /app

# Copy action files
COPY . /app

# Install Node.js dependencies
RUN npm install

# Set entrypoint to run index.js
ENTRYPOINT ["node", "/app/index.js"]
