FROM hashicorp/terraform:latest

# Install dependencies
RUN apk add --no-cache \
    bash \
    git \
    openssh \
    curl \
    jq \
    python3 \
    py3-pip

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]
