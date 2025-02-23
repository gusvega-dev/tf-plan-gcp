const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');
const stream = require('stream');

async function downloadFile(url, outputPath) {
    core.info(`📥 Downloading Terraform from ${url}...`);
    const pipeline = promisify(stream.pipeline);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
    await pipeline(response.body, fs.createWriteStream(outputPath));
}

async function run() {
    try {
        const tfVersion = core.getInput('tf_version') || '1.5.6';
        let workdir = core.getInput('workdir') || '.';

        core.info(`📢 Setting up Terraform version ${tfVersion}...`);

        // Define Terraform download URL
        const terraformUrl = `https://releases.hashicorp.com/terraform/${tfVersion}/terraform_${tfVersion}_linux_amd64.zip`;
        const terraformZip = path.join(__dirname, 'terraform.zip');
        const terraformBinary = path.join(__dirname, 'terraform');

        // Download and extract Terraform without apt-get
        await downloadFile(terraformUrl, terraformZip);
        await exec.exec(`unzip ${terraformZip}`);
        await exec.exec(`chmod +x terraform`);
        await exec.exec(`mv terraform /usr/local/bin/terraform`);

        // Verify Terraform installation
        await exec.exec('terraform --version');

        // Resolve absolute path for workdir
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
