# Terraform Plan GCP Action (`tf-plan-gcp`)

`tf-plan-gcp` is a GitHub Action that runs `terraform plan` inside a containerized environment. It helps execute Terraform plan operations with structured and collapsible output formatting, ensuring seamless integration with Google Cloud workflows.

---

## Features
- **Containerized Execution** → Runs inside a prebuilt Docker container.
- **Automatic Directory Handling** → Works within your Terraform directory.
- **Collapsible Terraform Output** → Groups resource changes for better readability.
- **Google Cloud Credentials Support** → Reads authentication from GitHub Secrets.
- **Works on Any GitHub Runner** → No dependency issues—run Terraform anywhere.

---

## Usage
### Basic Example
```yaml
- name: Run Terraform Plan
  uses: gusvega-dev/tf-plan-gcp@v1.0.1
  with:
    workdir: "./terraform"
  env:
    GOOGLE_APPLICATION_CREDENTIALS: "${{ secrets.GCP_CREDENTIALS }}"
```
This will:
- Run `terraform plan` inside the `./terraform` directory.
- Use Google Cloud credentials from GitHub Secrets (`GCP_CREDENTIALS`).
- Display formatted Terraform changes inside GitHub Actions logs.

---

## Inputs
| Name      | Required | Default | Description |
|-----------|----------|---------|-------------|
| `workdir` | No | `.` | Working directory for Terraform execution |

---

## Outputs
| Name          | Description |
|--------------|-------------|
| `plan_status` | The status of the Terraform Plan execution. |

---

## How the Container Knows About the Folder
GitHub Actions automatically mounts the repository into `/github/workspace` inside the container. Any files created there persist between different steps in the workflow.

- Inside the container, the Terraform directory is set as:
  ```sh
  /github/workspace/terraform
  ```
- The action automatically switches to this directory, so Terraform commands run in the expected location.

---

## Example: Repository Structure
Below is a recommended structure for using this action within a repository:
```
repo-root/
│── .github/
│   ├── workflows/
│   │   ├── terraform-plan.yml  # GitHub Action Workflow
│── terraform/
│   ├── main.tf                 # Terraform Configuration
│   ├── variables.tf            # Variables File
│   ├── outputs.tf              # Outputs File
│   ├── provider.tf             # Provider Configuration
│── README.md                   # Documentation
```

---

## Example: Full Terraform Workflow
Here’s a full Terraform CI/CD pipeline using `tf-plan-gcp`:
```yaml
name: Terraform CI

on:
  push:
    branches:
      - main

jobs:
  terraform-plan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Run Terraform Plan
        uses: gusvega-dev/tf-plan-gcp@v1.0.1
        with:
          workdir: "./terraform"
        env:
          GOOGLE_APPLICATION_CREDENTIALS: "${{ secrets.GCP_CREDENTIALS }}"
```
- Automatically runs Terraform Plan when pushing to `main`.
- Ensures the Terraform directory is set correctly.
- Uses Google Cloud credentials for authentication.

---

## Comparison vs. HashiCorp Terraform Action
| Feature                     | `tf-plan-gcp` (This Action) | HashiCorp Action |
|-----------------------------|----------------------|------------------|
| Requires Terraform Install  | No (Containerized) | Yes |
| Native GCP Support          | Yes | No |
| Structured Terraform Logs   | Yes | No |
| Works on Any GitHub Runner  | Yes | No (Requires Terraform Installed) |

---

## Future Enhancements
Additional Terraform automation tools are planned, including:
- Terraform Security Scanning
- Cost Estimation for Terraform
- Drift Detection and Auto-Remediation

Stay tuned for updates as these become available.

---

## Troubleshooting
### Terraform Plan Fails
Check the logs for errors:
1. Check for syntax issues in your Terraform files.
2. Verify Google Cloud credentials are correctly set in `secrets.GCP_CREDENTIALS`.

### Workdir Not Found
Make sure:
- The `workdir` input is set to the correct path inside your repository.
- Your Terraform configuration exists in the specified directory.

---

## License
This project is licensed under the MIT License.

---

## Author
Maintained by Gus Vega : [@gusvega](https://github.com/gusvega)

For feature requests and issues, please open a GitHub Issue.

---

### Ready to use?
Use `tf-plan-gcp` in your Terraform pipelines today.
Star this repository if you find it useful.

