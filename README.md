# BERDL Access Request Extension

A JupyterLab extension for requesting tenant access in BERDL and exporting credentials for local development.

## Features

- **Request Tenant Access**:
  - Request access to available tenant groups directly from JupyterLab.
  - Choose permission levels (read-only vs read-write).
  - Integrated Slack notifications for approval workflows.
- **Credential Export** (New):
  - Export your KBase authentication credentials for use with the `berdl-remote` CLI.
  - Generates a pre-configured `remote-config.yaml` file.
  - **Local Development Mode**: Automaticaly detects local environments and provides `skip_auth` configuration for testing.

## Usage

### Request Tenant Access
1. Open a notebook in JupyterLab.
2. Click the **"Request Tenant Access"** button (person icon) in the toolbar.
3. Select a tenant group and permission level.
4. Click **Submit Request**.

### Get Credentials
1. Click the **"Get Credentials"** button (key icon) in the toolbar.
2. Use the modal to:
   - **Download Config**: Downloads `remote-config.yaml`.
   - **Copy to Clipboard**: Copies the configuration text.
3. Save the file to `~/.berdl/remote-config.yaml` on your local machine to use with `berdl-remote`.

## Installation

### Docker (spark_notebook)
The extension is pre-installed in the `spark_notebook` Docker image.

### Development Setup

```bash
# 1. Install dependencies
jlpm install

# 2. Build the extension
jlpm build
python -m build

# 3. Install in development mode
pip install -e .
jupyter labextension develop --overwrite .

# 4. Watch for changes (Optional)
jlpm watch
# (In another terminal)
jupyter lab
```

## Architecture

- **Frontend**: TypeScript/React extension adding toolbar buttons and modals.
- **Backend**: Python server extension proxying requests and handling credential extraction.
- **API Endpoints**:
  - `GET /api/access-request/groups`: List available/current groups.
  - `POST /api/access-request/submit`: Submit access request.
  - `GET /api/access-request/credentials/info`: Check credential status.
  - `GET /api/access-request/credentials/config`: Download credential YAML.

## CI/CD Service

The project uses a unified **Release Workflow** (`release.yml`) for both PRs and Stable Releases:
- **Pull Requests**: Automatically builds a "Preview Release" wheel and comments on the PR with a direct install link.
- **Main Branch**: Automatically tags version, builds stable wheel, and creates a GitHub Release.