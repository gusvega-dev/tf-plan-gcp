const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        // Get workdir input (user-provided path inside their repo)
        let workdir = core.getInput('workdir') || '.';
        workdir = path.join('/github/workspace', workdir); // Ensure absolute path

        console.log(`📂 Workdir provided: ${workdir}`);

        // Ensure directory exists
        if (!fs.existsSync(workdir)) {
            throw new Error(`❌ Error: Specified workdir '${workdir}' does not exist!`);
        }

        // Change to Terraform directory
        process.chdir(workdir);
        console.log(`✅ Changed to workdir: ${workdir}`);

        // Handle Google Cloud Credentials
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            const gcpCredentialsPath = "/github/workspace/gcp-credentials.json";
            console.log(`🔑 Writing GCP credentials to ${gcpCredentialsPath}`);
            fs.writeFileSync(gcpCredentialsPath, process.env.GOOGLE_APPLICATION_CREDENTIALS);
            process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpCredentialsPath;
        } else {
            core.warning("⚠️ GOOGLE_APPLICATION_CREDENTIALS is not set.");
        }

        // Run Terraform Commands
        console.log("🏗 Running Terraform Init...");
        await exec.exec('terraform init -input=false');

        console.log("📊 Running Terraform Plan...");
        await exec.exec('terraform plan -out=tfplan');

        core.setOutput("plan_status", "success");
    } catch (error) {
        core.setFailed(`Terraform Plan failed: ${error.message}`);
    }
}

run();
