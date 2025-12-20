type Success<T> = { ok: true; result: T };
type Failure = { ok: false; error: unknown };
type RunResult<T> = Success<T> | Failure;

type RetryCallback = (params: {
  error: unknown;
  retryNumber: number;
}) => boolean | Promise<boolean>;

export async function run<T, NoCatch extends boolean = false>(
  callback: () => T | Promise<T>,
  opts?: { retry?: RetryCallback; noCatch?: NoCatch },
): Promise<NoCatch extends true ? T : RunResult<T>> {
  let retryNumber = 0;

  while (true) {
    try {
      const result = await callback();
      if (opts?.noCatch) {
        // biome-ignore lint/suspicious/noExplicitAny: .
        return result as any;
      }
      // biome-ignore lint/suspicious/noExplicitAny: .
      return { ok: true, result } as any;
    } catch (error) {
      if (opts?.retry) {
        retryNumber += 1;
        const shouldRetry = await opts.retry({ error, retryNumber });
        if (shouldRetry) {
          continue;
        }
      }
      if (opts?.noCatch) {
        throw error;
      }
      // biome-ignore lint/suspicious/noExplicitAny: .
      return { ok: false, error } as any;
    }
  }
}
