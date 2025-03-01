# Base image
FROM node:20

# Set non-interactive mode
ENV DEBIAN_FRONTEND=noninteractive 

# Install Terraform
RUN apt-get update && \
    apt-get install -y wget unzip && \
    wget -q https://releases.hashicorp.com/terraform/1.5.6/terraform_1.5.6_linux_amd64.zip && \
    unzip terraform_1.5.6_linux_amd64.zip && \
    mv terraform /usr/local/bin/terraform && \
    chmod +x /usr/local/bin/terraform && \
    rm -rf /var/lib/apt/lists/* terraform_1.5.6_linux_amd64.zip

# Set working directory to where GitHub mounts the user's repository
WORKDIR /github/workspace

# Copy action files (not user files)
COPY . /app
WORKDIR /app

# Install Node.js dependencies for the action
RUN npm install

# Set entrypoint and Suppress Docker logs but allow Terraform/Node.js output
ENTRYPOINT ["sh", "-c", "exec 2>/dev/null; node /app/index.js"]