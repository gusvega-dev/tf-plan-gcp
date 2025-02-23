const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const tfWorkingDir = core.getInput('tf_working_directory') || '.';
        const tfVersion = core.getInput('tf_version') || '1.5.0';

        core.info(`✅ Setting up Terraform ${tfVersion} in ${tfWorkingDir}`);

        // Install Terraform
        await exec.exec(`sudo apt-get update && sudo apt-get install -y wget unzip`);
        await exec.exec(`wget https://releases.hashicorp.com/terraform/${tfVersion}/terraform_${tfVersion}_linux_amd64.zip`);
        await exec.exec(`unzip terraform_${tfVersion}_linux_amd64.zip`);
        await exec.exec(`sudo mv terraform /usr/local/bin/terraform`);

        // Change to working directory
        process.chdir(tfWorkingDir);

        // Run Terraform Init
        core.info("🔄 Running Terraform Init...");
        await exec.exec('terraform init');

        // Run Terraform Plan
        core.info("📜 Running Terraform Plan...");
        await exec.exec('terraform plan -out=tfplan');

        // Convert Terraform Plan to JSON
        core.info("📄 Converting Terraform Plan to JSON...");
        await exec.exec('terraform show -json tfplan > plan.json');

        // Read the output
        const planOutput = fs.readFileSync(path.join(tfWorkingDir, 'plan.json'), 'utf8');
        core.setOutput('plan_output', planOutput);

        core.info("✅ Terraform Plan completed successfully!");
    } catch (error) {
        core.setFailed(`Terraform Plan failed: ${error.message}`);
    }
}

run();
