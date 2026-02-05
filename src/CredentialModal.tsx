/**
 * Credential Modal Component
 * 
 * Unified UI for exporting credentials (matches AccessRequestModal style).
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { getCredentialInfo, getCredentialDownloadUrl, getCredentialsAsText, CredentialInfo } from './api';

interface CredentialModalProps {
  onClose: () => void;
}

export function CredentialModal({ onClose }: CredentialModalProps): React.ReactElement {
  const [info, setInfo] = useState<CredentialInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadInfo();
  }, []);

  async function loadInfo() {
    try {
      setLoading(true);
      setError(null);
      const data = await getCredentialInfo();
      setInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const url = getCredentialDownloadUrl();
      const link = document.createElement('a');
      link.href = url;
      link.download = 'remote-config.yaml';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopy() {
    try {
      const text = await getCredentialsAsText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const isReady = info && (info.cookies_valid || info.local_mode);

  return (
    <div className="berdl-modal-backdrop" onClick={handleBackdropClick}>
      <div className="berdl-modal" style={{ width: '480px' }}>
        <div className="berdl-modal-header">
          <h2>Get Credentials</h2>
          <button className="berdl-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="berdl-modal-content">
          {loading ? (
            <div className="berdl-loading">Loading information...</div>
          ) : error ? (
            <div className="berdl-error">
              {error}
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <button className="berdl-btn" onClick={loadInfo}>Retry</button>
              </div>
            </div>
          ) : info ? (
            <>
              {/* User Info Block */}
              <div className="berdl-groups-list" style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Username:</strong> {info.username}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Hub URL:</strong> {info.hub_url}
                </div>
                <div>
                  <strong>Status:</strong>{' '}
                  <span style={{ color: isReady ? 'var(--jp-success-color0)' : 'var(--jp-error-color0)', fontWeight: 500 }}>
                    {info.cookies_valid ? '✓ Connected' : (info.local_mode ? '✓ Local Dev Mode' : '✗ Missing Auth')}
                  </span>
                </div>
              </div>

              {!isReady && (
                 <div className="berdl-error">
                   Missing cookies: {info.missing_cookies.join(', ')}. Please log in again.
                 </div>
              )}

              {/* Actions */}
              <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                <button 
                  className="berdl-btn berdl-btn-primary" 
                  onClick={handleDownload}
                  disabled={!isReady || downloading}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {downloading ? 'Downloading...' : '⬇️ Download Config File'}
                </button>
                <button 
                  className="berdl-btn" 
                  onClick={handleCopy}
                  disabled={!isReady}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
                </button>
              </div>

              <div className="berdl-muted" style={{ fontSize: '12px' }}>
                Save to <code>~/.berdl/remote-config.yaml</code> to use the CLI.
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
