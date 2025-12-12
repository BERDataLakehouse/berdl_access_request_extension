# BERDL Access Request Extension

A JupyterLab extension for requesting tenant access in BERDL.

## Features

- **Toolbar Button**: Adds a "Request Tenant Access" button to notebook toolbars
- **Modal Dialog**: User-friendly interface for selecting tenant groups
- **Permission Levels**: Choose between read-only or read-write access
- **Slack Integration**: Requests are sent to a Slack channel for approval

## Usage

1. Open a notebook in JupyterLab
2. Click the **"Request Tenant Access"** button in the toolbar
3. Select a tenant group from the **Available Groups** list
4. Choose a permission level (Read-Only or Read-Write)
5. Optionally provide a justification
6. Click **Submit Request**

Your request will be sent to the appropriate Slack channel for approval.

## Installation

### Docker (spark_notebook)

The extension is automatically installed when building the `spark_notebook` Docker image. See the docker-compose.yaml for configuration.

### Development

```bash
cd berdl_access_request_extension
jlpm install
jlpm build
pip install -e .
jupyter labextension develop --overwrite .
jupyter lab
```

## Architecture

- **Frontend**: TypeScript/React extension that adds toolbar button and modal
- **Backend**: Python server extension that proxies requests to `berdl_notebook_utils`
- **API Endpoints**:
  - `GET /api/access-request/groups` - Fetch available groups and user's groups
  - `POST /api/access-request/submit` - Submit access request

## Dependencies

- JupyterLab 4.x
- `berdl_notebook_utils` package (for governance functions)
- `tenant_access_request_service` (for Slack notifications)

## License

BSD 3-Clause License
