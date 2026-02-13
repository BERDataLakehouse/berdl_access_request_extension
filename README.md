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

## Requirements

- JupyterLab >= 4.0.0

## Install

The extension is pre-installed in the `spark_notebook` Docker image.

To install manually, add the wheel from a [GitHub Release](https://github.com/BERDataLakehouse/berdl_access_request_extension/releases):

```bash
uv add berdl-access-request @ https://github.com/BERDataLakehouse/berdl_access_request_extension/releases/download/<tag>/berdl_access_request-<version>-py3-none-any.whl
```

## Contributing

### Development install

Note: You will need NodeJS and [uv](https://docs.astral.sh/uv/) to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab.

```bash
# Clone the repo to your local environment
# Change directory to the berdl_access_request_extension directory

# Install dependencies with uv
uv sync --dev

# Link your development version of the extension with JupyterLab
uv run jupyter labextension develop . --overwrite

# Rebuild extension Typescript source after making changes
uv run jlpm build
```

### Running for development

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
uv run jlpm watch

# Run JupyterLab in another terminal
uv run jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

### Development uninstall

```bash
uv pip uninstall berdl-access-request
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `berdl-access-request` within that folder.

### Linting and testing

```bash
# Lint (auto-fix)
uv run jlpm lint

# Lint (check only)
uv run jlpm lint:check

# Run tests
uv run jlpm test
```

### Packaging the extension

Tag a release on GitHub to trigger the CI build and wheel packaging workflow.

## Architecture

- **Frontend**: TypeScript/React extension adding toolbar buttons and modals.
- **Backend**: Python server extension proxying requests and handling credential extraction.
- **API Endpoints**:
  - `GET /api/access-request/groups`: List available/current groups.
  - `POST /api/access-request/submit`: Submit access request.
  - `GET /api/access-request/credentials/info`: Check credential status.
  - `GET /api/access-request/credentials/config`: Download credential YAML.
