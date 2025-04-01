declare module 'papaparse' {
  export interface ParseConfig {
    delimiter?: string;
    newline?: string;
    quoteChar?: string;
    escapeChar?: string;
    header?: boolean;
    dynamicTyping?: boolean;
    preview?: number;
    encoding?: string;
    worker?: boolean;
    comments?: boolean | string;
    download?: boolean;
    skipEmptyLines?: boolean | 'greedy';
    fastMode?: boolean;
    withCredentials?: boolean;
    delimitersToGuess?: string[];
    chunk?: (results: ParseResult<any>, parser: Parser) => void;
    complete?: (results: ParseResult<any>, file: File) => void;
    error?: (error: Error, file: File) => void;
    transform?: (value: string, field: string | number) => any;
    transformHeader?: (header: string, index: number) => string;
  }

  export interface ParseResult<T> {
    data: T[];
    errors: Array<{
      type: string;
      code: string;
      message: string;
      row: number;
    }>;
    meta: {
      delimiter: string;
      linebreak: string;
      aborted: boolean;
      truncated: boolean;
      cursor: number;
      fields?: string[];
    };
  }

  export interface Parser {
    abort: () => void;
  }

  export function parse<T = any>(
    input: string | File | NodeJS.ReadableStream,
    config?: ParseConfig
  ): ParseResult<T>;
}