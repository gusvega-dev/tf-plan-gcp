const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');

/**
 * Sets up the working directory based on user input.
 */
function setupWorkdir() {
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
}

/**
 * Handles Google Cloud credentials setup if provided via environment variables.
 */
function setupGcpCredentials() {
    const gcpCredentialsPath = "/github/workspace/gcp-credentials.json";
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS; // Directly from env

    if (credentials) {
        try {
            console.log(`🔑 Writing GCP credentials to ${gcpCredentialsPath}`);
            fs.writeFileSync(gcpCredentialsPath, credentials);
            process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpCredentialsPath;
        } catch (error) {
            core.setFailed(`❌ Error processing GCP credentials: ${error.message}`);
        }
    } else {
        core.warning("⚠️ GOOGLE_APPLICATION_CREDENTIALS is not set in environment variables.");
    }
}

/**
 * Runs Terraform commands with suppressed output and extracts specific info from JSON.
 */
async function runTerraform() {
    console.log("🏗 Running Terraform Init...");
    await exec.exec('terraform init -input=false', [], { silent: false }); // Show output for debugging

    console.log("📊 Running Terraform Plan...");
    try {
        await exec.exec('terraform plan -out=tfplan', [], { silent: false }); // Show output for debugging
    } catch (error) {
        core.setFailed(`❌ Terraform Plan failed: ${error.message}`);
        return;
    }

    // Check if tfplan file exists before running terraform show
    if (!fs.existsSync("tfplan")) {
        core.setFailed("❌ Terraform plan file 'tfplan' was not generated. Check for Terraform errors above.");
        return;
    }

    // Generate JSON output
    console.log("📝 Converting Terraform plan to JSON...");
    const jsonOutputPath = "/github/workspace/tfplan.json";

    try {
        await exec.exec(`terraform show -json tfplan > ${jsonOutputPath}`, [], { silent: false });
    } catch (error) {
        core.setFailed(`❌ Failed to generate Terraform JSON output: ${error.message}`);
        return;
    }

    // Read and parse the JSON output
    if (fs.existsSync(jsonOutputPath)) {
        const tfJson = JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'));

        // Extract specific info (example: changed resources)
        const changes = tfJson.resource_changes ? tfJson.resource_changes.length : 0;

        // Set GitHub Actions output
        core.setOutput("resources_changed", changes);
        console.log(`🔍 Found ${changes} resource changes.`);
    } else {
        console.log("⚠️ No Terraform JSON output found.");
        core.setOutput("resources_changed", 0);
    }

    core.setOutput("plan_status", "success");
}

/**
 * Main execution function.
 */
async function run() {
    try {
        setupWorkdir();
        setupGcpCredentials(); // Uses GOOGLE_APPLICATION_CREDENTIALS directly
        await runTerraform();
    } catch (error) {
        core.setFailed(`Terraform Plan failed: ${error.message}`);
    }
}

run();
