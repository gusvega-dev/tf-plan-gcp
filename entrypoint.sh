#!/bin/sh
set -e  # Exit on error

WORKDIR=$1

echo "📢 Running Terraform in $WORKDIR..."
cd "$WORKDIR"

echo "🏗 Running Terraform Init..."
terraform init

echo "📊 Running Terraform Plan..."
terraform plan -out=tfplan

echo "✅ Terraform Plan completed successfully!"
