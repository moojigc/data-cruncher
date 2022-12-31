import * as ChildProcess from 'child_process';
import * as fs from 'fs';
import path = require('path');
import { logger, pythonLogger } from './utils/log';
import { parentProcessor, ParentProcessor } from './ParentProcessor';

export class PythonExecError extends Error {
  constructor(...messages: string[]) {
    super(messages.join('\n'));
  }
  name = 'PythonExecError';
}

/**
 * Run python from node
 *
 * ...god what am I doing
 */
export class PythonInterpreter {
  constructor(
    public processor: ParentProcessor,
    public pythonBinaryPath: string = 'python3',
  ) {}
  venvPath: string | null = null;
  subProcesses: Map<string, ChildProcess.ChildProcessWithoutNullStreams> =
    new Map();

  venvInit = false;
  pipInit = false;
  requirementsInit = false;

  spawn(args: string[], options?: ChildProcess.SpawnOptions) {
    return this.processor.spawn(this.pythonBinaryPath, args, options);
  }

  exec_m(command: string, options?: { noPanic?: boolean }) {
    return this.processor.exec(
      this.pythonBinaryPath,
      `-m ${command}`.split(' '),
      options,
    );
  }

  async checkVersion(binaryPath?: string) {
    const { stdout } = await this.processor.exec(
      binaryPath || this.pythonBinaryPath,
      ['--version'],
    );
    return stdout;
  }

  async checkVersions() {
    const versions = ['python3.9', 'python3.10', 'python3'];

    for (const version of versions) {
      try {
        const versionOutput = await this.checkVersion(version);
        logger.info(`Found ${versionOutput}`);
        this.pythonBinaryPath = version;
        return;
      } catch (e) {
        logger.info(`No ${version} found`);
      }
    }
  }

  async initEnvironment(venvParentDir: string) {
    await this.checkVersions();
    await this.createVenv(venvParentDir);
    await this._setupPip(venvParentDir);
    await this.installRequirements(
      path.join(venvParentDir, 'requirements.txt'),
    );
  }

  async createVenv(venvParentDir: string) {
    this.venvPath ??= path.join(venvParentDir, '.venv');

    logger.info(
      `Creating venv at ${this.venvPath} if it doesn't already exist...`,
    );

    // setup venv
    await this.exec_m(`venv ${this.venvPath}`);
    this.venvInit = true;
    this.pythonBinaryPath = path.join(this.venvPath, 'bin', 'python3');
  }

  private async _setupPip(venvParentDir: string) {
    await this.processor.exec(this.pythonBinaryPath, [`get-pip.py`], {
      cwd: venvParentDir,
    });
    await this.exec_m('pip install --upgrade pip');
    this.pipInit = true;
  }

  async installRequirements(
    pathToRequirementsFile: string = 'requirements.txt',
  ) {
    if (!this.requirementsInit) {
      await this.exec_m(`pip install -r ${pathToRequirementsFile}`);
      this.requirementsInit = true;
    }
  }

  cleanup(venvPath?: string) {
    const pathToRemove = venvPath || this.venvPath;
    this.processor.killAllChildren();
    logger.info(`Removing venv at ${pathToRemove}...`);
    fs.rmSync(`${pathToRemove}`, {
      recursive: true,
      force: true,
    });
    logger.info(`Removed venv.`);
    this.venvPath = null;
    this.pythonBinaryPath = 'python3';
    this.pipInit = false;
    this.venvInit = false;
    this.requirementsInit = false;

    return true;
  }
}

export const pythonInterpreter = new PythonInterpreter(parentProcessor);
