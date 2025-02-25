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
        console.log("🏗 Running Terraform Init...");
        await exec.exec('terraform init -input=false');

        console.log("📊 Running Terraform Plan...");
        let terraformPlanOutput = "";
        const options = {
            listeners: {
                stdout: (data) => { terraformPlanOutput += data.toString(); },
                stderr: (data) => { terraformPlanOutput += data.toString(); }
            }
        };
        await exec.exec('terraform plan -out=tfplan', [], options);

        // Process and format the Terraform output
        const formattedOutput = formatTerraformPlan(terraformPlanOutput);
        console.log(formattedOutput);

        core.setOutput("plan_status", "success");
    } catch (error) {
        core.setFailed(`Terraform Plan failed: ${error.message}`);
    }
}

function formatTerraformPlan(planOutput) {
    const lines = planOutput.split("\n");
    let createdResources = [];
    let changedResources = [];
    let destroyedResources = [];
    let outputs = [];
    let actionSummary = "";
    let capturingResource = false;
    let capturingOutputs = false;
    let currentResource = {};

    for (const line of lines) {
        if (line.includes("Terraform will perform the following actions:")) {
            capturingResource = true;
            continue;
        }
        if (line.includes("Changes to Outputs:")) {
            capturingOutputs = true;
            capturingResource = false;
            continue;
        }
        if (line.match(/^\s*Plan:/)) {
            actionSummary = `\n${line.trim()}`;
            capturingResource = false;
            capturingOutputs = false;
            continue;
        }

        // Capture resources being created (+), updated (~), or destroyed (-)
        if (capturingResource) {
            if (line.startsWith("  # ")) {
                if (Object.keys(currentResource).length > 0) {
                    if (currentResource.action === "+") createdResources.push(currentResource);
                    else if (currentResource.action === "~") changedResources.push(currentResource);
                    else if (currentResource.action === "-") destroyedResources.push(currentResource);
                }
                currentResource = { name: line.replace("  # ", "").trim(), attributes: [], action: "" };
            } else if (line.startsWith("  + ")) {
                currentResource.action = "+";
            } else if (line.startsWith("  ~ ")) {
                currentResource.action = "~";
            } else if (line.startsWith("  - ")) {
                currentResource.action = "-";
            } else if (line.startsWith("      + ") || line.startsWith("      ~ ") || line.startsWith("      - ")) {
                currentResource.attributes.push(line.replace("      ", "").trim());
            }
        }

        // Capture output changes
        if (capturingOutputs && line.startsWith("  + ")) {
            outputs.push(line.replace("  + ", "").trim());
        }
    }

    // Finalize last resource
    if (Object.keys(currentResource).length > 0) {
        if (currentResource.action === "+") createdResources.push(currentResource);
        else if (currentResource.action === "~") changedResources.push(currentResource);
        else if (currentResource.action === "-") destroyedResources.push(currentResource);
    }

    // Build formatted output with collapsible sections and nested collapsible resources
    let formatted = "\nTERRAFORM PLAN SUMMARY\n";
    formatted += "----------------------\n";
    formatted += actionSummary + "\n\n";

    if (createdResources.length > 0) {
        formatted += "::group::Resources to be Created\n";
        formatted += "------------------------------\n";
        createdResources.forEach(resource => {
            formatted += `::group::${resource.name}\n`;
            resource.attributes.forEach(attr => {
                formatted += `  ${attr}\n`;
            });
            formatted += "::endgroup::\n"; // Closes individual resource collapsibility
        });
        formatted += "::endgroup::\n\n"; // Closes "Resources to be Created" collapsibility
    }

    if (changedResources.length > 0) {
        formatted += "::group::Resources to be Updated\n";
        formatted += "------------------------------\n";
        changedResources.forEach(resource => {
            formatted += `::group::${resource.name}\n`;
            resource.attributes.forEach(attr => {
                formatted += `  ${attr}\n`;
            });
            formatted += "::endgroup::\n"; // Closes individual resource collapsibility
        });
        formatted += "::endgroup::\n\n"; // Closes "Resources to be Updated" collapsibility
    }

    if (destroyedResources.length > 0) {
        formatted += "::group::Resources to be Destroyed\n";
        formatted += "------------------------------\n";
        destroyedResources.forEach(resource => {
            formatted += `  - ${resource.name}\n`;
        });
        formatted += "::endgroup::\n\n"; // Closes "Resources to be Destroyed" collapsibility
    }

    if (outputs.length > 0) {
        formatted += "::group::Terraform Outputs\n";
        formatted += "-------------------------\n";
        outputs.forEach(output => {
            formatted += `  ${output}\n`;
        });
        formatted += "::endgroup::\n\n"; // Closes "Terraform Outputs" collapsibility
    }

    return formatted || "No changes detected.";
}

run();
