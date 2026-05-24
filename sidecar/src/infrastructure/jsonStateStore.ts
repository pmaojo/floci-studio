import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config';

export class JsonStateStore<T extends object> {
  constructor(
    private readonly fileName: string,
    private readonly initialState: T,
  ) {}

  async read(): Promise<T> {
    await this.ensureDirectory();
    try {
      const content = await readFile(this.filePath(), 'utf8');
      return {
        ...this.initialState,
        ...JSON.parse(content),
      };
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        await this.write(this.initialState);
        return this.initialState;
      }

      throw error;
    }
  }

  async write(state: T) {
    await this.ensureDirectory();
    await writeFile(this.filePath(), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  async update(mutator: (state: T) => T | void) {
    const current = await this.read();
    const next = mutator(current) || current;
    await this.write(next);
    return next;
  }

  private async ensureDirectory() {
    await mkdir(config.stateDir, { recursive: true });
  }

  private filePath() {
    return path.join(config.stateDir, this.fileName);
  }
}
