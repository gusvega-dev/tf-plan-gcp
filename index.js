const core = require('@actions/core');
const fs = require('fs');

try {
    // Read the Terraform plan output
    const planOutput = fs.readFileSync('plan.json', 'utf8');

    // Log and output the result
    console.log('Terraform Plan Output:', planOutput);
    core.setOutput('plan_output', planOutput);
} catch (error) {
    core.setFailed(`Terraform Plan failed: ${error.message}`);
}
