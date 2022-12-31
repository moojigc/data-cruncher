import * as ChildProcess from 'child_process';
import { logger } from './utils/log';

export const exec = (
  command: string,
): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    ChildProcess.exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

export class ParentProcessorError extends Error {
  constructor(...messages: string[]) {
    super(messages.join('\n'));
    this.name = this.constructor.name;
  }
}

export class ParentProcessor {
  subProcesses: Map<number, ChildProcess.ChildProcessWithoutNullStreams> =
    new Map();

  spawn(
    command: string,
    args: string[],
    options?: Omit<ChildProcess.SpawnOptions, 'stdio'>,
  ): ChildProcess.ChildProcessWithoutNullStreams {
    const subprocess = ChildProcess.spawn(
      command,
      args,
      {
        ...options,
        stdio: 'pipe',
        env: process.env,
      } || {
        stdio: 'pipe',
      },
    );

    const processStartedWith = `${command} ${args.join(' ')}`;

    subprocess.on('spawn', () => {
      this.subProcesses.set(subprocess.pid!, subprocess);
      logger.debug(
        `Spawned child process: ${processStartedWith} (pid ${subprocess.pid}; cwd ${options?.cwd})`,
      );
      logger.debug(`${this.subProcesses.size} child processes running`);
    });

    subprocess.on('exit', (exitCode) => {
      if (exitCode !== 0) {
        throw new ParentProcessorError(
          `Child process exited with code ${exitCode}: pid ${subprocess.pid} started with ${processStartedWith}`,
        );
      }
      logger.debug(
        `Child process exited with code ${exitCode}: pid ${subprocess.pid} started with ${processStartedWith}`,
      );
      this.subProcesses.delete(subprocess.pid!);
    });

    return subprocess;
  }

  killAllChildren() {
    for (const [id, subprocess] of this.subProcesses) {
      logger.debug(
        `Killing child process (pid ${subprocess.pid}; command: ${[
          subprocess.spawnfile,
          ...subprocess.spawnargs,
        ].join(' ')}`,
      );
      const success = subprocess.kill();

      if (!success) {
        logger.warn(`Failed to kill child process: ${subprocess.pid}`);
      }
    }
  }

  /**
   * spawns a child process and returns a promise that resolves when the process exits
   */
  async exec(
    command: string,
    args: string[],
    options?: { noPanic?: boolean; cwd?: string },
  ): Promise<{ stdout: string; stderr: string }> {
    const spawnString = `${command} ${args.join(' ')}`;
    logger.debug(
      `Executing command: ${spawnString}, options: ${JSON.stringify(options)}`,
    );

    let subprocess: ChildProcess.ChildProcessWithoutNullStreams;
    let standardOut = '';
    let standardError = '';

    try {
      subprocess = ChildProcess.spawn(command, args, {
        stdio: 'pipe',
        env: process.env,
        cwd: options?.cwd,
      });

      subprocess.on('spawn', () => {
        this.subProcesses.set(subprocess.pid!, subprocess);
      });

      subprocess.stdout.on('data', (data) => {
        standardOut += data.toString();
        logger.info(data.toString());
      });

      subprocess.stderr.on('data', (data) => {
        standardError += data.toString();
        logger.error(data.toString());
      });
    } catch (e) {
      new ParentProcessorError(
        `Failed to execute command: ${command}`,
        e as string,
      );
    }

    return new Promise((resolve, reject) => {
      const resolveFn = (code: number | null) => {
        logger.debug(`Command ${spawnString} exited with code ${code}`);
        this.subProcesses.delete(subprocess.pid!);
        if (code && !options?.noPanic) {
          logger.error(standardError);
          reject(
            new ParentProcessorError(
              `Command ${command} failed with code ${code}`,
              standardError,
            ),
          );
        } else {
          resolve({ stdout: standardOut, stderr: standardError });
        }
      };

      subprocess.once('exit', resolveFn);
    });
  }
}

export const parentProcessor = new ParentProcessor();
