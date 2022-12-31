import * as vscode from 'vscode';
import path = require('path');
import { REL_PYTHON_PATH, REL_SERVER_DIR } from '../utils/constants';
import { pythonInterpreter } from '../python';
import { logger } from '../utils/log';

export default async function initPythonVenv(context: vscode.ExtensionContext) {
  const serverPath = path.join(context.extensionPath, REL_SERVER_DIR);

  await pythonInterpreter.initEnvironment(serverPath);

  logger.info('Python venv and requirements installed.');

  vscode.window.showInformationMessage(
    'Data Cruncher Python virtual environment is ready.',
  );
}
