const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process'); // Use execSync for capturing output


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
    await exec.exec('terraform init -input=false', [], { silent: true }); // Show output for debugging

    console.log("📊 Running Terraform Plan...");
    try {
        await exec.exec('terraform plan -out=tfplan', [], { silent: true }); // Show output for debugging
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
        const jsonOutput = execSync('terraform show -json tfplan', { encoding: 'utf8' }); // Capture JSON output
        fs.writeFileSync(jsonOutputPath, jsonOutput); // Write to file manually
    } catch (error) {
        core.setFailed(`❌ Failed to generate Terraform JSON output: ${error.message}`);
        return;
    }

    // Read and parse the JSON output
    if (fs.existsSync(jsonOutputPath)) {
        const tfJson = JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'));
    
        // Extract all resource changes
        const changes = tfJson.resource_changes || [];
        const changesCount = changes.length;
    
        // Categorize resources by action type
        const changeCategories = {
            create: [],
            update: [],
            delete: []
        };
    
        changes.forEach(change => {
            const address = change.address; // Full resource path
            const actions = change.change.actions; // Array of actions (["create"], ["update"], ["delete"])
    
            // Extract attributes as key-value pairs
            const attributes = change.change.after || {};
            const formattedAttributes = Object.entries(attributes)
                .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
                .join("\n");
    
            actions.forEach(action => {
                if (changeCategories[action]) {
                    changeCategories[action].push({ address, formattedAttributes });
                }
            });
        });
    
        // ✅ Now, count the number of each type **after** populating the categories
        const createCount = changeCategories.create.length;
        const updateCount = changeCategories.update.length;
        const deleteCount = changeCategories.delete.length;
    
        // Print summary
        console.log("🔄 Terraform Plan Changes:");
        console.log(`🔍 Found ${changesCount} resource changes.`);
        console.log(`CREATE: ${createCount} | UPDATE: ${updateCount} | DELETE: ${deleteCount}\n`);
    
        // Define display order
        const actionLabels = {
            create: "CREATE",
            update: "UPDATE",
            delete: "DELETE"
        };
    
        ["create", "update", "delete"].forEach(action => {
            if (changeCategories[action].length > 0) {
                console.log(`${actionLabels[action]}:`);
    
                changeCategories[action].forEach(resource => {
                    console.log(`▶ ${resource.address}`);
    
                    // ✅ Make each resource collapsible using `::group::`
                    console.log(`::group::Details for ${resource.address}`);
                    console.log(resource.formattedAttributes); // Key-value format instead of JSON
                    console.log("::endgroup::");
                });
    
                console.log(""); // Add empty line for spacing
            }
        });
    
        // Set GitHub Actions outputs
        core.setOutput("resources_changed", changesCount);
        core.setOutput("change_details", JSON.stringify(changeCategories));
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