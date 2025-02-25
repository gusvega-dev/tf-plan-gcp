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
        await exec.exec('terraform plan -out=tfplan');

        console.log("📄 Converting Terraform Plan to JSON...");
        let terraformJsonOutput = "";
        const options = {
            listeners: {
                stdout: (data) => { terraformJsonOutput += data.toString(); },
                stderr: (data) => { terraformJsonOutput += data.toString(); }
            }
        };
        await exec.exec('terraform show -json tfplan', [], options);

        // Parse JSON and format the output
        const formattedOutput = formatTerraformJson(terraformJsonOutput);
        console.log(formattedOutput);

        core.setOutput("plan_status", "success");
    } catch (error) {
        core.setFailed(`Terraform Plan failed: ${error.message}`);
    }
}

function formatTerraformJson(jsonOutput) {
    let plan;
    try {
        plan = JSON.parse(jsonOutput);
    } catch (error) {
        return `❌ Error parsing Terraform JSON output: ${error.message}`;
    }

    if (!plan || !plan.resource_changes) {
        return "✅ No changes detected.";
    }

    let formatted = "\nTERRAFORM PLAN SUMMARY\n";
    formatted += "----------------------\n";

    const createdResources = [];
    const changedResources = [];
    const destroyedResources = [];
    const outputs = [];

    plan.resource_changes.forEach(change => {
        const action = change.change.actions;
        const resourceName = `${change.type}.${change.name}`;

        if (action.includes("create")) {
            createdResources.push(resourceName);
        } else if (action.includes("update")) {
            changedResources.push(resourceName);
        } else if (action.includes("delete")) {
            destroyedResources.push(resourceName);
        }
    });

    if (plan.output_changes) {
        Object.keys(plan.output_changes).forEach(outputKey => {
            outputs.push(`${outputKey}: ${JSON.stringify(plan.output_changes[outputKey])}`);
        });
    }

    if (createdResources.length > 0) {
        formatted += "::group::Resources to be Created\n";
        createdResources.forEach(resource => {
            formatted += `  - ${resource}\n`;
        });
        formatted += "::endgroup::\n\n";
    }

    if (changedResources.length > 0) {
        formatted += "::group::Resources to be Updated\n";
        changedResources.forEach(resource => {
            formatted += `  - ${resource}\n`;
        });
        formatted += "::endgroup::\n\n";
    }

    if (destroyedResources.length > 0) {
        formatted += "::group::Resources to be Destroyed\n";
        destroyedResources.forEach(resource => {
            formatted += `  - ${resource}\n`;
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

    return formatted || "✅ No changes detected.";
}

run();
