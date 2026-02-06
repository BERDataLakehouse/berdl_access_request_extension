/**
 * BERDL Access Request JupyterLab Extension.
 * 
 * Adds a toolbar button to notebooks for requesting tenant access.
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { ToolbarButton, ReactWidget, showDialog, Dialog } from '@jupyterlab/apputils';

import * as React from 'react';

import { AccessRequestModal } from './AccessRequestModal';
import { CredentialModal } from './CredentialModal';

/**
 * Command ID for the access request command.
 */
const COMMAND_ID = 'berdl:request-access';
const COMMAND_ID_CRED = 'berdl:get-credentials';

/**
 * Widget that wraps the AccessRequestModal for use in JupyterLab dialogs.
 */
class AccessRequestWidget extends ReactWidget {
  private _onClose: () => void;

  constructor(onClose: () => void) {
    super();
    this._onClose = onClose;
    this.addClass('berdl-access-request-widget');
  }

  render(): React.ReactElement {
    return <AccessRequestModal onClose={this._onClose} />;
  }
}

/**
 * Widget that wraps the CredentialModal for use in JupyterLab dialogs.
 */
class CredentialWidget extends ReactWidget {
  private _onClose: () => void;

  constructor(onClose: () => void) {
    super();
    this._onClose = onClose;
    this.addClass('berdl-access-request-widget'); // Reuse style
  }

  render(): React.ReactElement {
    return <CredentialModal onClose={this._onClose} />;
  }
}

/**
 * Shows the access request modal as a JupyterLab dialog.
 */
async function showAccessRequestModal(): Promise<void> {
  return new Promise<void>((resolve) => {
    const widget = new AccessRequestWidget(() => {
      // Close the dialog by flushing all dialogs
      Dialog.flush();
      resolve();
    });
    
    showDialog({
      title: '',
      body: widget,
      buttons: [],
      hasClose: false,
    });
  });
}

/**
 * Shows the credential modal as a JupyterLab dialog.
 */
async function showCredentialModal(): Promise<void> {
  return new Promise<void>((resolve) => {
    const widget = new CredentialWidget(() => {
      Dialog.flush();
      resolve();
    });
    
    showDialog({
      title: '',
      body: widget,
      buttons: [],
      hasClose: false,
    });
  });
}

/**
 * Add the access request button to a notebook toolbar.
 */
function addAccessRequestButton(panel: NotebookPanel): void {
  const button = new ToolbarButton({
    label: 'Request Tenant Access',
    tooltip: 'Request access to a tenant group',
    onClick: () => {
      showAccessRequestModal();
    },
  });

  // Insert at the end of the toolbar for robustness
  panel.toolbar.addItem('berdl-access-request', button);
}

/**
 * Add the credential button to a notebook toolbar.
 */
function addCredentialButton(panel: NotebookPanel): void {
  const button = new ToolbarButton({
    label: 'Get Credentials',
    tooltip: 'Get berdl-remote credentials',
    onClick: () => {
      showCredentialModal();
    },
  });

  // Insert after access request or at end
  panel.toolbar.addItem('berdl-get-credentials', button);
}

/**
 * The extension plugin.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'berdl-access-request:plugin',
  description: 'JupyterLab extension for tenant access requests',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, notebookTracker: INotebookTracker) => {
    console.log('BERDL Access Request extension activated');

    // Add command to the command palette
    app.commands.addCommand(COMMAND_ID, {
      label: 'Request Tenant Access',
      caption: 'Request access to a data tenant group',
      execute: () => {
        showAccessRequestModal();
      },
    });

    app.commands.addCommand(COMMAND_ID_CRED, {
      label: 'Get Credentials',
      caption: 'Get berdl-remote credentials',
      execute: () => {
        showCredentialModal();
      },
    });

    // Add button to existing notebook panels
    notebookTracker.forEach((panel) => {
      addAccessRequestButton(panel);
      addCredentialButton(panel);
    });

    // Add button to new notebook panels
    notebookTracker.widgetAdded.connect((_, panel) => {
      addAccessRequestButton(panel);
      addCredentialButton(panel);
    });
  },
};

export default plugin;
