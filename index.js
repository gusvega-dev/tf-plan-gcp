const core = require("@actions/core");
const exec = require("@actions/exec");
const fs = require("fs");
const path = require("path");

async function run() {
  try {
    // Get working directory
    let workdir = core.getInput("workdir") || ".";
    workdir = path.resolve(workdir);
    console.log(`📂 Workdir provided: ${workdir}`);

    // Ensure directory exists
    if (!fs.existsSync(workdir)) {
      throw new Error(`❌ Error: Specified workdir '${workdir}' does not exist!`);
    }

    // Change to Terraform directory
    process.chdir(workdir);
    console.log(`✅ Changed to workdir: ${workdir}`);

    // Check if Terraform is installed
    console.log("🔍 Checking Terraform version...");
    await exec.exec("terraform version");

    // Run Terraform Init with Caching Optimization
    console.log("🏗 Running Terraform Init...");
    await exec.exec("terraform init -input=false");

    // Run Terraform Plan
    console.log("📊 Running Terraform Plan...");
    await exec.exec("terraform plan -out=tfplan");

    core.setOutput("plan_status", "success");
  } catch (error) {
    core.setFailed(`Terraform Plan failed: ${error.message}`);
  }
}

run();
