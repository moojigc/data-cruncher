import path = require('path');
import * as vscode from 'vscode';
import * as py from '../python';
import getWebviewContent from '../utils/getWebviewContent';
import initPythonVenv from './initPythonVenv';
import { logger, pythonLogger } from '../utils/log';
import getOpenPort from '../utils/getOpenPort';
import { MTTP, MTTPStack } from '../utils/parseMTTP';
import { ChildProcess } from 'child_process';
import { parentProcessor, ParentProcessor } from '../ParentProcessor';
import useState from '../utils/useState';

async function openDevServer(context: vscode.ExtensionContext) {
  const WEB_SERVER_PORT = 5174;
  vscode.window.showInformationMessage(
    `Starting Data Cruncher UI server at http://localhost:${WEB_SERVER_PORT}...`,
  );
  const child = parentProcessor.spawn('npm', ['run', 'start'], {
    cwd: path.join(context.extensionPath, 'server', 'ui'),
  });

  const mttpStderrMessageStack = new MTTPStack();

  logger.info(`Attaching to Svelte server stderr`);
  child.stderr.on('data', (data) => {
    mttpStderrMessageStack.push(data.toString());
  });

  const { callback: webviewHandlerCallback, panel } = WebviewHandler(
    context,
    child,
    WEB_SERVER_PORT,
  );

  logger.info(`Attaching to Svelte server stdout`);
  child.stdout.on('data', async (buffer: Buffer) => {
    const data = buffer.toString('utf-8');
    if (/localhost:\d/.test(data)) {
      webviewHandlerCallback(
        new MTTP({
          type: 'READY',
          body: {
            port: WEB_SERVER_PORT,
          },
        }),
      );
    }
  });

  return panel;
}

export default async function openWebview(context: vscode.ExtensionContext) {
  const state = useState(context);
  if (state.get().panelActive) {
    logger.info('Webview already open');
    return;
  }
  const webServerPort =
    context.extensionMode === vscode.ExtensionMode.Development
      ? 3173
      : await getOpenPort();

  vscode.window.showInformationMessage(
    'Starting Data Cruncher Python server...',
  );

  process.env.WEB_SERVER_PORT = webServerPort.toString();

  await initPythonVenv(context);

  const child = py.pythonInterpreter.spawn(
    ['app.py'].concat(
      context.extensionMode === vscode.ExtensionMode.Development
        ? ['--debug']
        : [],
    ),
    {
      cwd: path.join(context.extensionPath, 'server'),
      env: {
        ...process.env,
        WEB_SERVER_PORT: webServerPort.toString(),
      },
    },
  );

  if (context.extensionMode !== vscode.ExtensionMode.Production) {
    return await openDevServer(context);
  }

  const { callback: webviewHandlerCallback, panel } = WebviewHandler(
    context,
    child,
    webServerPort,
  );

  const mttpStderrMessageStack = new MTTPStack();
  child.stderr?.on('data', (buffer: Buffer) => {
    mttpStderrMessageStack.push(buffer);
    const mttpMessage = mttpStderrMessageStack.consume();

    if (!panel && mttpMessage) {
      throw new py.PythonExecError(
        `Failed to start Data Cruncher server. ${mttpMessage.body}`,
      );
    }
  });

  const mttpStdoutMessageStack = new MTTPStack();
  child.stdout?.on('data', async (buffer: Buffer) => {
    mttpStdoutMessageStack.push(buffer);
    const mttpMessage = mttpStdoutMessageStack.consume();
    if (mttpMessage) {
      webviewHandlerCallback(mttpMessage);
    }
  });

  return panel;
}

function WebviewHandler(
  context: vscode.ExtensionContext,
  child: ChildProcess,
  webServerPort: number,
) {
  const state = useState(context);
  let panel: vscode.WebviewPanel | null = null;
  const callback = async (mttpMessage: MTTP) => {
    // Guard clause for when the webview is already open
    if (panel || mttpMessage.type !== 'READY') {
      return;
    }

    const address = `http://localhost:${webServerPort}/`;

    logger.info(`Data Cruncher Python server is ready at ${address}`);

    // webview handled here
    panel = vscode.window.createWebviewPanel(
      'dataCruncher',
      'Data Cruncher | Home',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
      },
    );

    panel.webview.html = await getWebviewContent(address);

    state.set({ panelActive: true });

    const timer = setInterval(() => {
      if (panel) {
        panel.webview.postMessage({
          type: 'ping',
          message: vscode.workspace.workspaceFolders?.[0].uri,
        });
        logger.debug('Sent message to webview (ping).');
      } else {
        clearInterval(timer);
      }
    }, 10);

    panel.onDidDispose(
      () => {
        panel = null;
        const killed = child.kill();
        state.set({ panelActive: false });
        if (killed) {
          vscode.window.showInformationMessage(
            'Data Cruncher Python server closed.',
          );
        } else {
          vscode.window.showErrorMessage(
            'Data Cruncher Python server failed to close',
          );
        }
        clearInterval(timer);
      },
      null,
      context.subscriptions,
    );

    vscode.window.showInformationMessage('Data Cruncher is ready!');
  };

  return {
    callback,
    panel,
  };
}
