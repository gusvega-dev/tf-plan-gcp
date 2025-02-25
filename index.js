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
