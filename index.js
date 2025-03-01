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

// /**
//  * Retrieves and decodes secrets from the provided `secrets` input or environment variables.
//  * @param {string} secretName - The name of the secret key.
//  * @returns {string | null} - The decoded secret value or null if not found.
//  */
// function getSecret(secretName) {
//     let secretsInput = core.getInput('secrets'); // Get optional secrets object
//     let secretsObj = {};

//     // Parse secrets JSON if provided
//     if (secretsInput) {
//         try {
//             secretsObj = JSON.parse(secretsInput);
//         } catch (error) {
//             core.warning(`⚠️ Invalid JSON format in secrets input: ${error.message}`);
//         }
//     }

//     // Check in secrets input first, then fall back to environment variables
//     let secret = secretsObj[secretName] || process.env[secretName];

//     if (!secret) {
//         core.warning(`⚠️ Secret '${secretName}' is not set.`);
//         return null;
//     }

//     // Decode if it's base64-encoded
//     if (!secret.trim().startsWith("{")) {
//         console.log(`🔍 Detected base64-encoded secret: ${secretName}. Decoding...`);
//         secret = Buffer.from(secret, "base64").toString("utf-8");
//     }

//     return secret;
// }

// /**
//  * Handles Google Cloud credentials setup.
//  */
// function setupGcpCredentials() {
//     const gcpCredentialsPath = "/github/workspace/gcp-credentials.json";
//     const credentials = getSecret("GOOGLE_APPLICATION_CREDENTIALS");

//     if (credentials) {
//         try {
//             console.log(`🔑 Writing GCP credentials to ${gcpCredentialsPath}`);
//             fs.writeFileSync(gcpCredentialsPath, credentials);
//             process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpCredentialsPath;
//         } catch (error) {
//             core.setFailed(`❌ Error processing GCP credentials: ${error.message}`);
//         }
//     }
// }

/**
 * Runs Terraform commands: init and plan.
 */
async function runTerraform() {
    console.log("🏗 Running Terraform Init...");
    await exec.exec('terraform init -input=false');

    console.log("📊 Running Terraform Plan...");
    await exec.exec('terraform plan -out=tfplan');

    core.setOutput("plan_status", "success");
}

/**
 * Main execution function.
 */
async function run() {
    try {
        setupWorkdir();
        // setupGcpCredentials();
        await runTerraform();
    } catch (error) {
        core.setFailed(`Terraform Plan failed: ${error.message}`);
    }
}

run();
