const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const tfVersion = core.getInput('tf_version') || '1.5.6';
        let workdir = core.getInput('workdir') || '.';

        core.info(`📢 Setting up Terraform version ${tfVersion}...`);

        // Install Terraform
        await exec.exec(`sudo apt-get update && sudo apt-get install -y wget unzip`);
        await exec.exec(`wget https://releases.hashicorp.com/terraform/${tfVersion}/terraform_${tfVersion}_linux_amd64.zip`);
        await exec.exec(`unzip terraform_${tfVersion}_linux_amd64.zip`);
        await exec.exec(`sudo mv terraform /usr/local/bin/terraform`);

        // Resolve absolute path for the workdir
        workdir = path.resolve(workdir);
        core.info(`📂 Changing to working directory: ${workdir}`);

        // Ensure directory exists
        if (!fs.existsSync(workdir)) {
            throw new Error(`❌ Error: Specified workdir '${workdir}' does not exist!`);
        }

        // Change to working directory
        process.chdir(workdir);

        // Debug: List directory contents
        core.info(`📁 Listing files in: ${workdir}`);
        const files = fs.readdirSync(workdir);
        core.info(`📂 Files: ${files.join(', ')}`);

        // Check if Terraform files exist
        const tfFiles = files.filter(file => file.endsWith('.tf'));
        if (tfFiles.length === 0) {
            throw new Error("❌ Error: No Terraform configuration files (.tf) found in the workdir!");
        }

        // Run Terraform Init
        core.info("🏗 Running Terraform Init...");
        await exec.exec('terraform init');

        // Run Terraform Plan
        core.info("📊 Running Terraform Plan...");
        await exec.exec('terraform plan -out=tfplan');

        // Convert Terraform Plan to JSON
        core.info("📄 Converting Terraform Plan to JSON...");
        await exec.exec('terraform show -json tfplan > plan.json');

        // Read and output plan
        const planOutput = fs.readFileSync(path.join(workdir, 'plan.json'), 'utf8');
        core.setOutput('plan_status', planOutput);
        core.info("✅ Terraform Plan completed successfully!");
    } catch (error) {
        core.setFailed(`Terraform Plan failed: ${error.message}`);
    }
}

run();
