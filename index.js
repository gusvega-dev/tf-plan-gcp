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
        const gcpCredentialsPath = "/github/workspace/gcp-credentials.json";
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            try {
                console.log(`🔑 Writing GCP credentials to ${gcpCredentialsPath}`);
                let credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        
                // Check if the credentials are base64 encoded
                if (!credentials.trim().startsWith("{")) {
                    console.log("🔍 Detected base64-encoded credentials. Decoding...");
                    credentials = Buffer.from(credentials, "base64").toString("utf-8");
                }
        
                fs.writeFileSync(gcpCredentialsPath, credentials);
                process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpCredentialsPath;
            } catch (error) {
                core.setFailed(`❌ Error processing GCP credentials: ${error.message}`);
            }
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
