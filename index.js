const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const workdir = core.getInput('workdir') || '.';

        // Resolve absolute path for workdir
        const absoluteWorkdir = path.resolve(workdir);
        core.info(`📂 Changing to working directory: ${absoluteWorkdir}`);

        // Ensure directory exists
        if (!fs.existsSync(absoluteWorkdir)) {
            throw new Error(`❌ Error: Specified workdir '${absoluteWorkdir}' does not exist!`);
        }

        // Change to working directory
        process.chdir(absoluteWorkdir);

        // Debug: List directory contents
        core.info(`📁 Listing files in: ${absoluteWorkdir}`);
        const files = fs.readdirSync(absoluteWorkdir);
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
        const planOutput = fs.readFileSync(path.join(absoluteWorkdir, 'plan.json'), 'utf8');
        core.setOutput('plan_status', planOutput);
        core.info("✅ Terraform Plan completed successfully!");
    } catch (error) {
        core.setFailed(`Terraform Plan failed: ${error.message}`);
    }
}

run();
