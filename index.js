const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const workdir = core.getInput('workdir') || '.';

        // Ensure Terraform can access the GCP credentials
        const gcpCredentialsPath = "/app/gcp-credentials.json";
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            core.info(`🔑 Writing GCP credentials to ${gcpCredentialsPath}`);
            fs.writeFileSync(gcpCredentialsPath, process.env.GOOGLE_APPLICATION_CREDENTIALS);
            process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpCredentialsPath; // Ensure it's set correctly
        } else {
            core.warning("⚠️ GOOGLE_APPLICATION_CREDENTIALS is not set.");
        }

        // Change to the specified working directory
        const absoluteWorkdir = path.resolve(workdir);
        process.chdir(absoluteWorkdir);
        core.info(`📂 Changed to working directory: ${absoluteWorkdir}`);

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
