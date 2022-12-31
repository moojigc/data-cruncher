import { logger } from './log';

interface MTTPBody {
  type: string;
  body: any;
}

const MTTP_HEADER = 'MTTP 0.1';
const MTTP_FOOTER = '0.1 MTTP';
const HEADER_REGEX = new RegExp(`${MTTP_HEADER}`);
const FOOTER_REGEX = new RegExp(`${MTTP_FOOTER}`);

export class MTTPStack {
  stack: MTTP[] = [];
  pendingMessage: MTTP | null = null;

  consume() {
    const mttp = this.stack.shift();
    if (mttp) {
      return mttp;
    }
  }

  push(chunk: Buffer) {
    // ignore if not MTTP and not already in a message
    if (!MTTP.isMTTP(chunk) && !this.pendingMessage) {
      return;
    }
    this.pendingMessage ??= new MTTP();
    this.pendingMessage.accept(chunk);
    if (this.pendingMessage.complete) {
      this.stack.push(this.pendingMessage);
      this.pendingMessage = null;
    }
  }
}

/**
 * the Moojig Text Transfer Protocol 😎
 */
export class MTTP {
  public static isMTTP(data: Buffer): boolean {
    return HEADER_REGEX.test(data.toString('utf-8'));
  }

  constructor(data?: MTTPBody) {
    if (data) {
      this.body = {
        type: data.type,
        body: data.body,
      };
    }
  }

  /**
   * Alias for `this.body.type`
   */
  type?: string;
  body?: MTTPBody;
  length: number = 0;

  chunks: Buffer[] = [];

  private _endIndex?: number;

  get complete() {
    return !!this.type || !!this._endIndex;
  }

  includesFooter(chunk: Buffer) {
    const included = FOOTER_REGEX.test(chunk.toString('utf-8'));
    logger.info(`MTTP: Footer included: ${included}`);

    return included;
  }

  getBody() {
    let data: string = '';
    let footer: string | null = null;
    while (this.chunks.length > 0) {
      const str = this.chunks.shift()?.toString('utf-8') || '';
      const headerMatch = str.match(HEADER_REGEX);
      const footerMatch = str.match(FOOTER_REGEX);

      if (headerMatch?.[0] && footerMatch?.[0]) {
        data += str.slice(
          headerMatch.index! + headerMatch[0].length,
          footerMatch.index,
        );
        logger.info(`MTTP: Data: ${data}`);
      } else if (headerMatch?.[0]) {
        const following = str.slice(headerMatch.index! + headerMatch[0].length);
        data += following;
      } else if (footerMatch?.[0]) {
        footer = footerMatch[0];
        const previous = str.slice(0, footerMatch.index);
        logger.debug(`MTTP: Previous: ${previous}`);
        data += previous;
        data += footer;
      } else {
        data = data += str;
      }

      logger.debug(`MTTP: Chunk length: ${this.chunks.length}`);
    }

    return data;
  }

  accept(chunk: Buffer) {
    if (this._endIndex) {
      return true;
    }

    logger.info(`MTTP: Received chunk of length ${chunk.length}`);

    this.chunks.push(chunk);
    this.length += chunk.length;

    if (this.includesFooter(chunk)) {
      this._endIndex = this.chunks.length - 1;
      try {
        this.body = JSON.parse(this.getBody().trim());
      } catch (e) {
        logger.error(`MTTP: Failed to parse body: ${e}`);
      }
      this.type = this.body?.type;

      logger.info(`MTTP: Body ${this.body}`);
      logger.info(`MTTP: Type ${this.type}`);
    }

    return false;
  }
}
