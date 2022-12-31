import Winston = require('winston');
import * as vscode from 'vscode';

const templateFn = (info: Winston.Logform.TransformableInfo) =>
  `[Data Cruncher ${info.level.toUpperCase()} ${new Date().toLocaleTimeString()}]: ${String.raw(
    {
      raw: info.message,
    },
  )}`;

export const logger = Winston.createLogger({
  level: 'debug',
  format: Winston.format.printf(templateFn),
  transports: [new Winston.transports.Console()],
});

export const pythonLogger = Winston.createLogger({
  level: 'debug',
  format: Winston.format.printf(
    (info) => `[PYTHON] ${String.raw({ raw: info.message })}`,
  ),
  transports: [new Winston.transports.Console()],
});

export function initLogger(context: vscode.ExtensionContext) {
  if (context.extensionMode === vscode.ExtensionMode.Production) {
    logger.transports.pop();
    logger.transports.push(
      ...[
        new Winston.transports.File({ filename: 'error.log', level: 'error' }),
        new Winston.transports.File({ filename: 'combined.log' }),
      ],
    );
  }
}
