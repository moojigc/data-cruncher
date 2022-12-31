import * as vscode from 'vscode';
import { pythonInterpreter } from '../python';

export default async function verifyPythonVersion(
  context: vscode.ExtensionContext,
) {
  const version = await pythonInterpreter.checkVersion();
  vscode.window.showInformationMessage(
    `[Data Cruncher] Python version: ${version} is installed at ${pythonInterpreter.pythonBinaryPath}`,
  );
}
