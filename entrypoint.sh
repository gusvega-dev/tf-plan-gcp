#!/bin/sh

set -e

# Navigate to Terraform working directory
cd "$TF_WORKING_DIR"

# Initialize Terraform
terraform init

# Run Terraform plan
terraform plan -out=tfplan

# Convert plan to JSON
terraform show -json tfplan > plan.json

# Run the JavaScript script to handle output
node /app/index.js
