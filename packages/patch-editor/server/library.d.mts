export function handle(
  req: { url: string; method: string; bodyText: string },
  res: { writeHead(status: number, headers?: Record<string, string>): void; end(body?: string): void },
): Promise<boolean>;
