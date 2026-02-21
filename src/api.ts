/**
 * API client for the BERDL Access Request extension.
 *
 * Communicates with the Python server extension endpoints.
 */

import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

/**
 * Response from the groups endpoint.
 */
export interface GroupsResponse {
  available_groups: string[];
  my_groups: string[];
}

/**
 * Response from the submit endpoint.
 */
export interface SubmitResponse {
  status: string;
  message: string;
  tenant_name: string;
  permission: string;
}

/**
 * Request body for submitting access request.
 */
export interface SubmitRequest {
  tenant_name: string;
  permission: 'read_only' | 'read_write';
  justification?: string;
}

/**
 * Fetch available groups and user's current groups.
 */
export async function fetchGroups(): Promise<GroupsResponse> {
  const settings = ServerConnection.makeSettings();
  const requestUrl = URLExt.join(
    settings.baseUrl,
    'api',
    'access-request',
    'groups'
  );

  const response = await ServerConnection.makeRequest(requestUrl, {}, settings);

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Submit a tenant access request.
 */
export async function submitAccessRequest(
  request: SubmitRequest
): Promise<SubmitResponse> {
  const settings = ServerConnection.makeSettings();
  const requestUrl = URLExt.join(
    settings.baseUrl,
    'api',
    'access-request',
    'submit'
  );

  const response = await ServerConnection.makeRequest(
    requestUrl,
    {
      method: 'POST',
      body: JSON.stringify(request)
    },
    settings
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Credential info response from the server.
 */
export interface CredentialInfo {
  username: string;
  hub_url: string;
  cookies_valid: boolean;
  local_mode?: boolean;
  missing_cookies: string[];
}

/**
 * Get credential info from the server.
 */
export async function getCredentialInfo(): Promise<CredentialInfo> {
  const settings = ServerConnection.makeSettings();
  const url = URLExt.join(
    settings.baseUrl,
    'api',
    'access-request',
    'credentials',
    'info'
  );

  const response = await ServerConnection.makeRequest(url, {}, settings);

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to get credential info');
  }

  return response.json();
}

/**
 * Get the download URL for credentials.
 */
export function getCredentialDownloadUrl(): string {
  const settings = ServerConnection.makeSettings();
  return URLExt.join(
    settings.baseUrl,
    'api',
    'access-request',
    'credentials',
    'config'
  );
}

/**
 * Get credentials as text (for clipboard).
 */
export async function getCredentialsAsText(): Promise<string> {
  const settings = ServerConnection.makeSettings();
  const url = URLExt.join(
    settings.baseUrl,
    'api',
    'access-request',
    'credentials',
    'config'
  );

  const response = await ServerConnection.makeRequest(url, {}, settings);

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to get credentials');
  }

  return response.text();
}
