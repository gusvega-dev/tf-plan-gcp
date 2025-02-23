#!/bin/sh
set -e  # Exit on error

WORKDIR=${1:-"."}  # Default to the current directory if no input is given

echo "📂 Working Directory: $WORKDIR"
cd "$WORKDIR"
ls -la $WORKDIR  # List files to check if Terraform config exists

if [ ! -d "$WORKDIR" ]; then
  echo "❌ Error: Specified workdir does not exist!"
  exit 1
fi

echo "🏗 Running Terraform Init..."
terraform init

echo "📊 Running Terraform Plan..."
terraform plan -out=tfplan
