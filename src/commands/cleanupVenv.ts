import * as vscode from 'vscode';
import path = require('path');
import { REL_PYTHON_PATH, REL_SERVER_DIR } from '../utils/constants';
import { pythonInterpreter } from '../python';

export default async function cleanupVenv(context: vscode.ExtensionContext) {
  const venvRemoved = pythonInterpreter.cleanup(
    path.join(context.extensionPath, REL_SERVER_DIR, '.venv'),
  );
  if (venvRemoved) {
    vscode.window.showInformationMessage(
      'Data Cruncher Python virtual environment has been uninstalled.',
    );
  } else {
    vscode.window.showInformationMessage(
      'Data Cruncher Python virtual environment was not found.',
    );
  }
}
