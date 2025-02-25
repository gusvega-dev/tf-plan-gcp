const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const exec = require('@actions/exec');

async function run() {
    try {
        let workdir = core.getInput('workdir') || '.';
        workdir = path.join('/github/workspace', workdir);
        console.log(`📂 Workdir provided: ${workdir}`);

        if (!fs.existsSync(workdir)) {
            throw new Error(`❌ Error: Specified workdir '${workdir}' does not exist!`);
        }

        process.chdir(workdir);
        console.log(`✅ Changed to workdir: ${workdir}`);

        // Handle GCP Credentials
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
        const trimmedLine = line.trim();

        if (trimmedLine.includes("Terraform will perform the following actions:")) {
            capturingResource = true;
            continue;
        }
        if (trimmedLine.includes("Changes to Outputs:")) {
            capturingOutputs = true;
            capturingResource = false;
            continue;
        }
        if (trimmedLine.startsWith("Plan:")) {
            actionSummary = `\n${trimmedLine}`;
            capturingResource = false;
            capturingOutputs = false;
            continue;
        }

        if (capturingResource) {
            if (trimmedLine.startsWith("#")) {
                if (currentResource) {
                    if (currentResource.action === "+") createdResources.push(currentResource);
                    else if (currentResource.action === "~") changedResources.push(currentResource);
                    else if (currentResource.action === "-") destroyedResources.push(currentResource);
                }

                let resourceName = trimmedLine.split(" ")[1].trim();
                currentResource = { name: resourceName, attributes: [], action: "+" };
            } else if (trimmedLine.startsWith("+") || trimmedLine.startsWith("~") || trimmedLine.startsWith("-")) {
                if (currentResource) {
                    currentResource.attributes.push(trimmedLine);
                }
            }
        }

        if (capturingOutputs && trimmedLine.startsWith("+")) {
            outputs.push(trimmedLine.replace("+ ", "").trim());
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
