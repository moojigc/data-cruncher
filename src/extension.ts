import * as vscode from 'vscode';
import { logger } from './utils/log';
import commandModules from './commands';
import { PythonExecError, pythonInterpreter } from './python';
import { parentProcessor } from './ParentProcessor';

let env: vscode.ExtensionMode;

export async function activate(context: vscode.ExtensionContext) {
  env = context.extensionMode;
  logger.info('Data Cruncher is activated!');
  for (const command in commandModules) {
    logger.debug(`Loading command ${command}`);
    const disposable = vscode.commands.registerCommand(
      `data-cruncher.${command}`,
      () => {
        try {
          // @ts-ignore
          const ret = commandModules[command](context);
          if (ret instanceof Promise) {
            ret.catch((error: any) => {
              vscode.window.showErrorMessage(`[Data Cruncher] Error: ${error}`);
            });
          }
        } catch (error) {
          vscode.window.showErrorMessage(`[Data Cruncher] Error: ${error}`);
        }
      },
    );

    context.subscriptions.push(disposable);
  }
}

export function deactivate() {
  logger.info('Data Cruncher is deactivating...');
  if (env === vscode.ExtensionMode.Development) {
    parentProcessor.killAllChildren();
    return;
  }
  pythonInterpreter.cleanup();
}
