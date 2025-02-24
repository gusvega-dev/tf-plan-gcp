const core = require('@actions/core');
const fs = require('fs');
const exec = require('@actions/exec'); 
const path = require('path');

async function run() {
    try {
        let workdir = core.getInput('workdir') || '.';

        // Resolve absolute path
        // workdir = path.resolve(workdir);
        console.log(`📂 Workdir provided: ${workdir}`);

        // Print current working directory before changing
        console.log(`🔍 Current directory: ${process.cwd()}`);
        console.log("📁 Listing current directory contents:");
        fs.readdirSync(process.cwd()).forEach(file => {
            console.log(`  📄 ${file}`);
        });

        // Ensure directory exists
        if (!fs.existsSync(workdir)) {
            throw new Error(`❌ Error: Specified workdir '${workdir}' does not exist!`);
        }

        // Change to working directory
        process.chdir(workdir);
        console.log(`✅ Changed to workdir: ${workdir}`);

        // Print new working directory contents
        console.log("📁 Listing workdir contents:");
        fs.readdirSync(workdir).forEach(file => {
            console.log(`  📄 ${file}`);
        });

        // Ensure Terraform can access the GCP credentials
        const gcpCredentialsPath = "/app/gcp-credentials.json";
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            console.log(`🔑 Writing GCP credentials to ${gcpCredentialsPath}`);
            fs.writeFileSync(gcpCredentialsPath, process.env.GOOGLE_APPLICATION_CREDENTIALS);
            process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpCredentialsPath; // Ensure it's set correctly
        } else {
            core.warning("⚠️ GOOGLE_APPLICATION_CREDENTIALS is not set.");
        }

        // Ensure Terraform Init works
        console.log("🏗 Running Terraform Init...");
        await exec.exec('terraform init');

        // Run Terraform Plan
        console.log("📊 Running Terraform Plan...");
        await exec.exec('terraform plan -out=tfplan');

    } catch (error) {
        core.setFailed(`Terraform Plan failed: ${error.message}`);
    }
}

run();
