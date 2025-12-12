/**
 * React component for the Access Request Modal.
 */

import * as React from 'react';
import { fetchGroups, submitAccessRequest, GroupsResponse } from './api';

interface AccessRequestModalProps {
  onClose: () => void;
}

interface ModalState {
  loading: boolean;
  submitting: boolean;
  error: string | null;
  success: string | null;
  availableGroups: string[];
  myGroups: string[];
  selectedGroup: string;
  permission: 'read_only' | 'read_write';
  justification: string;
}

/**
 * Modal component for requesting tenant access.
 */
export function AccessRequestModal({ onClose }: AccessRequestModalProps): React.ReactElement {
  const [state, setState] = React.useState<ModalState>({
    loading: true,
    submitting: false,
    error: null,
    success: null,
    availableGroups: [],
    myGroups: [],
    selectedGroup: '',
    permission: 'read_only',
    justification: '',
  });

  // Fetch groups on mount
  React.useEffect(() => {
    fetchGroups()
      .then((data: GroupsResponse) => {
        // Show all available groups
        setState(prev => ({
          ...prev,
          loading: false,
          availableGroups: data.available_groups,
          myGroups: data.my_groups,
          selectedGroup: data.available_groups[0] || '',
        }));
      })
      .catch((err: Error) => {
        setState(prev => ({
          ...prev,
          loading: false,
          error: `Failed to load groups: ${err.message}`,
        }));
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!state.selectedGroup) {
      if (state.availableGroups.length === 0) {
        setState(prev => ({ ...prev, error: 'No groups available to request access to' }));
      } else {
        setState(prev => ({ ...prev, error: 'Please select a group' }));
      }
      return;
    }

    setState(prev => ({ ...prev, submitting: true, error: null }));

    try {
      const result = await submitAccessRequest({
        tenant_name: state.selectedGroup,
        permission: state.permission,
        justification: state.justification || undefined,
      });
      
      setState(prev => ({
        ...prev,
        submitting: false,
        success: result.message,
      }));
    } catch (err) {
      let errorMessage = 'An unknown error occurred';
      if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
        errorMessage = (err as any).message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      setState(prev => ({
        ...prev,
        submitting: false,
        error: `Failed to submit request: ${errorMessage}`,
      }));
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="berdl-modal-backdrop" onClick={handleBackdropClick}>
      <div className="berdl-modal">
        <div className="berdl-modal-header">
          <h2>Request Tenant Access</h2>
          <button className="berdl-modal-close" onClick={onClose} aria-label="Close dialog">×</button>
        </div>
        
        <div className="berdl-modal-content">
          {state.loading ? (
            <div className="berdl-loading">Loading groups...</div>
          ) : state.success ? (
            <div className="berdl-success">
              <p>{state.success}</p>
              <button className="berdl-btn berdl-btn-primary" onClick={onClose}>
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {state.error && (
                <div className="berdl-error">{state.error}</div>
              )}
              
              <div className="berdl-form-row">
                <div className="berdl-form-group berdl-form-group-half">
                  <label>Available Tenants</label>
                  <select
                    className="berdl-select"
                    value={state.selectedGroup}
                    onChange={e => setState(prev => ({ ...prev, selectedGroup: e.target.value }))}
                    size={6}
                  >
                    {state.availableGroups.length === 0 ? (
                      <option disabled>No groups available</option>
                    ) : (
                      state.availableGroups.map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))
                    )}
                  </select>
                </div>
                
                <div className="berdl-form-group berdl-form-group-half">
                  <label>My Tenants</label>
                  <div className="berdl-groups-list">
                    {state.myGroups.length === 0 ? (
                      <span className="berdl-muted">No tenant memberships</span>
                    ) : (
                      state.myGroups.map(group => (
                        <div key={group} className="berdl-group-item">{group}</div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              
              <div className="berdl-form-group">
                <label>Permission Level</label>
                <div className="berdl-radio-group">
                  <label className="berdl-radio">
                    <input
                      type="radio"
                      name="permission"
                      value="read_only"
                      checked={state.permission === 'read_only'}
                      onChange={() => setState(prev => ({ ...prev, permission: 'read_only' }))}
                    />
                    <span>Read-Only</span>
                  </label>
                  <label className="berdl-radio">
                    <input
                      type="radio"
                      name="permission"
                      value="read_write"
                      checked={state.permission === 'read_write'}
                      onChange={() => setState(prev => ({ ...prev, permission: 'read_write' }))}
                    />
                    <span>Read-Write</span>
                  </label>
                </div>
              </div>
              
              <div className="berdl-form-group">
                <label htmlFor="justification-textarea">Justification (optional)</label>
                <textarea
                  id="justification-textarea"
                  className="berdl-textarea"
                  placeholder="Why do you need access to this tenant?"
                  value={state.justification}
                  onChange={e => setState(prev => ({ ...prev, justification: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="berdl-form-actions">
                <button
                  type="button"
                  className="berdl-btn"
                  onClick={onClose}
                  disabled={state.submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="berdl-btn berdl-btn-primary"
                  disabled={state.submitting || !state.selectedGroup}
                >
                  {state.submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
