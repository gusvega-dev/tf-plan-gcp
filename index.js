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

                if (!credentials.trim().startsWith("{")) {
                    console.log("🔍 Detected base64-encoded credentials. Decoding...");
                    credentials = Buffer.from(credentials, "base64").toString("utf-8");
                }

                fs.writeFileSync(gcpCredentialsPath, credentials);
                console.log(`✅ GCP credentials successfully written to ${gcpCredentialsPath}`);

                process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpCredentialsPath;
                console.log(`🌍 GOOGLE_APPLICATION_CREDENTIALS is now set to: ${gcpCredentialsPath}`);
            } catch (error) {
                core.setFailed(`❌ Error processing GCP credentials: ${error.message}`);
                return;
            }
        } else {
            core.warning("⚠️ GOOGLE_APPLICATION_CREDENTIALS is not set.");
        }

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
    let currentResource = null;

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

        if (capturingResource) {
            if (line.startsWith("  # ")) {
                if (currentResource) {
                    if (currentResource.action === "+") createdResources.push(currentResource);
                    else if (currentResource.action === "~") changedResources.push(currentResource);
                    else if (currentResource.action === "-") destroyedResources.push(currentResource);
                }

                let resourceName = line.replace("  # ", "").split(" ")[0].trim();
                currentResource = { name: resourceName, attributes: [], action: "+" };
            } else if (line.trim().startsWith("+")) {
                if (currentResource) {
                    currentResource.attributes.push(line.replace("+ ", "").trim());
                }
            }
        }

        if (capturingOutputs && line.trim().startsWith("+")) {
            outputs.push(line.replace("+ ", "").trim());
        }
    }

    if (currentResource) {
        if (currentResource.action === "+") createdResources.push(currentResource);
        else if (currentResource.action === "~") changedResources.push(currentResource);
        else if (currentResource.action === "-") destroyedResources.push(currentResource);
    }

    let formatted = "\nTERRAFORM PLAN SUMMARY\n";
    formatted += "----------------------\n";
    formatted += actionSummary + "\n\n";

    if (createdResources.length > 0) {
        formatted += "::group::Resources to be Created\n";
        createdResources.forEach(resource => {
            formatted += `::group::${resource.name}\n`;
            resource.attributes.forEach(attr => {
                formatted += `  ${attr}\n`;
            });
            formatted += "::endgroup::\n";
        });
        formatted += "::endgroup::\n\n";
    }

    if (changedResources.length > 0) {
        formatted += "::group::Resources to be Updated\n";
        changedResources.forEach(resource => {
            formatted += `::group::${resource.name}\n`;
            resource.attributes.forEach(attr => {
                formatted += `  ${attr}\n`;
            });
            formatted += "::endgroup::\n";
        });
        formatted += "::endgroup::\n\n";
    }

    if (destroyedResources.length > 0) {
        formatted += "::group::Resources to be Destroyed\n";
        destroyedResources.forEach(resource => {
            formatted += `  - ${resource.name}\n`;
        });
        formatted += "::endgroup::\n\n";
    }

    if (outputs.length > 0) {
        formatted += "::group::Terraform Outputs\n";
        outputs.forEach(output => {
            formatted += `  ${output}\n`;
        });
        formatted += "::endgroup::\n\n";
    }

    return formatted || "No changes detected.";
}

run();
