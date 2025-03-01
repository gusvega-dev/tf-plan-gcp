# tf-plan-gcp

How the Container Knows About the Folder
GitHub Actions automatically mounts the repository into /github/workspace inside the container. Any files created there are shared between the runner and the container, allowing Terraform and other processes to access them without extra volume setup. 