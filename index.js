const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const exec = require('@actions/exec');

async function run() {
    try {
        let workdir = core.getInput('workdir') || '.';
        workdir = path.join('/github/workspace', workdir);
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
                console.log("🔑 Processing GOOGLE_APPLICATION_CREDENTIALS...");

                let credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

                // Check if credentials are base64-encoded (instead of raw JSON)
                if (!credentials.trim().startsWith("{")) {
                    console.log("🔍 Detected base64-encoded credentials. Decoding...");
                    credentials = Buffer.from(credentials, "base64").toString("utf-8");
                }

                // Write JSON credentials to a file
                fs.writeFileSync(gcpCredentialsPath, credentials);
                console.log(`✅ GCP credentials successfully written to ${gcpCredentialsPath}`);

                // Set the correct environment variable for Terraform
                process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpCredentialsPath;
                console.log(`🌍 GOOGLE_APPLICATION_CREDENTIALS is now set to: ${gcpCredentialsPath}`);
            } catch (error) {
                core.setFailed(`❌ Error processing GCP credentials: ${error.message}`);
                return;
            }
        } else {
            core.warning("⚠️ GOOGLE_APPLICATION_CREDENTIALS is not set.");
        }

        // Run Terraform Commands
        console.log("::group::🏗 Running Terraform Init & Plan");
        await exec.exec('terraform init -input=false');
        await exec.exec('terraform plan -out=tfplan');
        console.log("::endgroup::");

        console.log("::group::📄 Converting Terraform Plan to JSON");
        let terraformJsonOutput = "";
        const options = {
            listeners: {
                stdout: (data) => { terraformJsonOutput += data.toString(); },
                stderr: (data) => { terraformJsonOutput += data.toString(); }
            }
        };
        await exec.exec('terraform show -json tfplan', [], options);
        console.log("::endgroup::");

        // ✅ Just print the raw JSON output to verify
        console.log("📜 Terraform JSON Output:");
        console.log(terraformJsonOutput);
    } catch (error) {
        core.setFailed(`Terraform Plan failed: ${error.message}`);
    }
}

run();
