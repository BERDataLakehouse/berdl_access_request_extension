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

            self.write_json(
                {
                    "status": result.get("status", "unknown"),
                    "message": result.get("message", ""),
                    "tenant_name": result.get("tenant_name", ""),
                    "permission": result.get("permission", ""),
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
    ]

    web_app.add_handlers(host_pattern, handlers)
    logger.info("BERDL Access Request handlers registered")
