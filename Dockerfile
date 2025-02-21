FROM hashicorp/terraform:1.5.0

LABEL "com.github.actions.name"="Terraform Plan Action"
LABEL "com.github.actions.description"="Run Terraform plan inside a GitHub Action"
LABEL "com.github.actions.icon"="terminal"
LABEL "com.github.actions.color"="blue"

# Install Node.js for JavaScript execution
RUN apk add --no-cache nodejs npm git

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json /app/

# Install dependencies using lock file for consistency
RUN npm ci --prefix /app

# Copy script files
COPY entrypoint.sh /entrypoint.sh
COPY index.js /app/index.js

# Make entrypoint executable
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
