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
  const requestUrl = URLExt.join(settings.baseUrl, 'api', 'access-request', 'groups');
  
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
export async function submitAccessRequest(request: SubmitRequest): Promise<SubmitResponse> {
  const settings = ServerConnection.makeSettings();
  const requestUrl = URLExt.join(settings.baseUrl, 'api', 'access-request', 'submit');
  
  const response = await ServerConnection.makeRequest(
    requestUrl,
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
    settings
  );
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  
  return response.json();
}
