"""
HTTP handlers for the BERDL Access Request server extension.

Provides REST API endpoints that proxy calls to the berdl_notebook_utils
governance functions.
"""

import json
import logging
from typing import Any

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado.web
import os
import yaml
from datetime import datetime, timedelta

from berdl_notebook_utils.minio_governance import (
    list_available_groups,
    get_my_groups,
    request_tenant_access,
)

logger = logging.getLogger(__name__)


class BaseHandler(APIHandler):
    """Base handler with common utilities."""

    def get_json_body(self) -> dict[str, Any]:
        """Parse JSON body from request."""
        body_str = self.request.body.decode("utf-8")
        if not body_str.strip():
            raise ValueError("Request body is empty or missing.")
        try:
            return json.loads(body_str)
        except json.JSONDecodeError:
            raise ValueError("Malformed JSON in request body.")

    def write_json(self, data: dict[str, Any], status: int = 200) -> None:
        """Write JSON response."""
        self.set_status(status)
        self.set_header("Content-Type", "application/json")
        self.finish(json.dumps(data))

    def write_error_json(self, message: str, status: int = 500) -> None:
        """Write JSON error response."""
        self.set_status(status)
        self.set_header("Content-Type", "application/json")
        self.finish(json.dumps({"error": message}))


class GroupsHandler(BaseHandler):
    """Handler for fetching available groups and user's current groups."""

    @tornado.web.authenticated
    def get(self) -> None:
        """
        GET /api/access-request/groups

        Returns available groups and user's current group memberships.
        """
        try:
            # Get available groups to request access to
            available_groups = list_available_groups()

            # Get user's current groups
            my_groups_response = get_my_groups()
            my_groups = my_groups_response.groups if my_groups_response else []

            self.write_json(
                {
                    "available_groups": available_groups,
                    "my_groups": my_groups,
                }
            )

        except Exception as e:
            logger.exception("Error fetching groups")
            self.write_error_json(str(e), status=500)


class SubmitRequestHandler(BaseHandler):
    """Handler for submitting tenant access requests."""

    @tornado.web.authenticated
    def post(self) -> None:
        """
        POST /api/access-request/submit

        Body: {
            "tenant_name": "kbase",
            "permission": "read_only" | "read_write",
            "justification": "optional reason"
        }
        """
        try:
            body = self.get_json_body()

            tenant_name = body.get("tenant_name")
            permission = body.get("permission", "read_only")
            justification = body.get("justification")

            if not tenant_name:
                self.write_error_json("tenant_name is required", status=400)
                return

            if permission not in ("read_only", "read_write"):
                self.write_error_json(
                    "permission must be 'read_only' or 'read_write'", status=400
                )
                return

            # Submit the request
            result = request_tenant_access(
                tenant_name=tenant_name,
                permission=permission,
                justification=justification,
            )

            required_keys = ("status", "message", "tenant_name", "permission")
            missing_keys = [k for k in required_keys if k not in result]
            if missing_keys:
                logger.error(
                    f"request_tenant_access returned missing keys: {missing_keys}"
                )
                self.write_error_json(
                    f"Internal error: response missing keys: {', '.join(missing_keys)}",
                    status=502,
                )
                return

            self.write_json(
                {
                    "status": result["status"],
                    "message": result["message"],
                    "tenant_name": result["tenant_name"],
                    "permission": result["permission"],
                }
            )

        except ValueError as e:
            logger.warning(f"Invalid request: {e}")
            self.write_error_json(str(e), status=400)
        except RuntimeError as e:
            logger.error(f"Request failed: {e}")
            self.write_error_json(str(e), status=502)
        except Exception as e:
            logger.exception("Error submitting access request")
            self.write_error_json(str(e), status=500)

    logger.info("BERDL Access Request handlers registered")


# Credential Handlers (Merged from berdl_credential_extension)


class CredentialHandler(BaseHandler):
    """Handler for credential extraction and export."""

    @tornado.web.authenticated
    def get(self):
        """
        Get credentials as a YAML config file.

        GET /api/access-request/credentials/config
        """
        try:
            # Get hub URL
            hub_url = os.environ.get(
                "JUPYTERHUB_BASE_URL", self.request.headers.get("X-Forwarded-Host", "")
            )
            protocol = self.request.headers.get("X-Forwarded-Proto", "https")
            host = self.request.headers.get("Host", "")

            # Try to get the hub URL from the environment first
            if "JUPYTERHUB_URL" in os.environ:
                hub_url = os.environ["JUPYTERHUB_URL"]
            elif "JUPYTERHUB_SERVICE_PREFIX" in os.environ:
                forwarded_host = self.request.headers.get("X-Forwarded-Host", host)
                hub_url = f"{protocol}://{forwarded_host}"
            else:
                # Fallback for local development
                hub_url = f"{protocol}://{host}"

            # Get username
            username = os.environ.get("JUPYTERHUB_USER", os.environ.get("NB_USER", ""))

            # Extract cookies
            cookies = {}
            cookie_header = self.request.headers.get("Cookie", "")
            for cookie_pair in cookie_header.split(";"):
                cookie_pair = cookie_pair.strip()
                if "=" in cookie_pair:
                    name, value = cookie_pair.split("=", 1)
                    name = name.strip()
                    if name in ("_xsrf", "jupyterhub-session-id") or name.startswith(
                        "jupyterhub-user-"
                    ):
                        cookies[name] = value.strip()

            # Check if we have a valid JupyterHub session
            # We need _xsrf AND jupyterhub-session-id AND the user cookie
            has_xsrf = "_xsrf" in cookies
            has_session = "jupyterhub-session-id" in cookies
            has_user_cookie = False
            for name in cookies:
                if name.startswith(f"jupyterhub-user-{username}"):
                    has_user_cookie = True
                    break

            is_valid_hub_session = has_xsrf and has_session and has_user_cookie

            if not is_valid_hub_session:
                # Fallback for local development or broken session
                # If we are missing hub cookies, we assume local development mode

                config = {
                    "hub_url": hub_url.rstrip("/"),
                    "username": username or "local",
                    "cookies": {},
                    "skip_auth": True,  # New field for berdl-remote
                }
            else:
                # Standard auth mode - we have all required cookies
                expires_at = (datetime.utcnow() + timedelta(hours=24)).isoformat() + "Z"
                config = {
                    "hub_url": hub_url.rstrip("/"),
                    "username": username,
                    "cookies": cookies,
                    "expires_at": expires_at,
                }

            # Return YAML or JSON
            output_format = self.get_argument("format", "yaml")
            if output_format == "json":
                self.set_header("Content-Type", "application/json")
                self.finish(json.dumps(config, indent=2))
            else:
                self.set_header("Content-Type", "application/x-yaml")
                self.set_header(
                    "Content-Disposition", "attachment; filename=remote-config.yaml"
                )
                self.finish(yaml.dump(config, default_flow_style=False))

        except Exception as e:
            logger.exception("Error generating credentials")
            self.write_error_json(str(e), status=500)


class CredentialInfoHandler(APIHandler):
    """Handler for getting credential info."""

    @tornado.web.authenticated
    def get(self):
        """
        Get credential status info.

        GET /api/access-request/credentials/info
        """
        try:
            username = os.environ.get(
                "JUPYTERHUB_USER", os.environ.get("NB_USER", "unknown")
            )

            protocol = self.request.headers.get("X-Forwarded-Proto", "https")
            host = self.request.headers.get(
                "X-Forwarded-Host", self.request.headers.get("Host", "")
            )
            hub_url = f"{protocol}://{host}"

            if "JUPYTERHUB_URL" in os.environ:
                hub_url = os.environ["JUPYTERHUB_URL"]

            cookie_header = self.request.headers.get("Cookie", "")
            has_xsrf = "_xsrf=" in cookie_header
            has_session = "jupyterhub-session-id=" in cookie_header
            has_user_cookie = f"jupyterhub-user-{username}=" in cookie_header

            cookies_valid = has_xsrf and has_session and has_user_cookie
            missing_cookies = [
                c
                for c, present in [
                    ("_xsrf", has_xsrf),
                    ("jupyterhub-session-id", has_session),
                    (f"jupyterhub-user-{username}", has_user_cookie),
                ]
                if not present
            ]

            # Local mode fallback detection
            local_mode = False
            if not cookies_valid:
                # Assuming local mode if cookies are missing
                local_mode = True

            self.finish(
                json.dumps(
                    {
                        "username": username,
                        "hub_url": hub_url.rstrip("/"),
                        "cookies_valid": cookies_valid,
                        "local_mode": local_mode,
                        "missing_cookies": missing_cookies,
                    }
                )
            )

        except Exception as e:
            logger.exception("Error getting credential info")
            self.write_error_json(str(e), status=500)


def setup_handlers(web_app: Any) -> None:
    """Register handlers with the Jupyter server."""
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]

    handlers = [
        (
            url_path_join(base_url, "api", "access-request", "groups"),
            GroupsHandler,
        ),
        (
            url_path_join(base_url, "api", "access-request", "submit"),
            SubmitRequestHandler,
        ),
        (
            url_path_join(base_url, "api", "access-request", "credentials", "config"),
            CredentialHandler,
        ),
        (
            url_path_join(base_url, "api", "access-request", "credentials", "info"),
            CredentialInfoHandler,
        ),
    ]

    web_app.add_handlers(host_pattern, handlers)
    logger.info("BERDL Access Request handlers registered (including credentials)")
