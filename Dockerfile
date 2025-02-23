FROM hashicorp/terraform:latest

# Install dependencies
RUN apk add --no-cache \
    bash \
    git \
    openssh \
    curl \
    jq

# Install tfenv for version management
RUN git clone https://github.com/tfutils/tfenv.git ~/.tfenv && \
    ln -s ~/.tfenv/bin/* /usr/local/bin/

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Run the script
ENTRYPOINT ["/entrypoint.sh"]