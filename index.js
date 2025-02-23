const core = require('@actions/core');
const fs = require('fs');
const exec = require('@actions/exec'); 
const path = require('path');

async function run() {
    try {
        let workdir = core.getInput('workdir') || '.';

        // Resolve absolute path
        workdir = path.resolve(workdir);
        core.info(`📂 Changing to working directory: ${workdir}`);

        // Ensure directory exists
        if (!fs.existsSync(workdir)) {
            throw new Error(`❌ Error: Specified workdir '${workdir}' does not exist!`);
        }

        // Change to working directory
        process.chdir(workdir);

        // Ensure Terraform can access the GCP credentials
        const gcpCredentialsPath = "/app/gcp-credentials.json";
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            core.info(`🔑 Writing GCP credentials to ${gcpCredentialsPath}`);
            fs.writeFileSync(gcpCredentialsPath, process.env.GOOGLE_APPLICATION_CREDENTIALS);
            process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpCredentialsPath; // Ensure it's set correctly
        } else {
            core.warning("⚠️ GOOGLE_APPLICATION_CREDENTIALS is not set.");
        }

        // Run Terraform Init
        core.info("🏗 Running Terraform Init...");
        await exec.exec('terraform init');

        // Run Terraform Plan
        core.info("📊 Running Terraform Plan...");
        await exec.exec('terraform plan -out=tfplan');

    } catch (error) {
        core.setFailed(`Terraform Plan failed: ${error.message}`);
    }
}

run();
