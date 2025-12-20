/** biome-ignore-all lint/nursery/noUselessUndefined: . */
/** biome-ignore-all lint/nursery/noIncrementDecrement: . */
/** biome-ignore-all lint/style/useThrowOnlyError: . */
import { describe, expect, test } from "bun:test";
import { run } from "./run";

describe("run - basic success cases", () => {
  test("returns success result for synchronous callback", async () => {
    const result = await run(() => 42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toBe(42);
    }
  });

  test("returns success result for async callback", async () => {
    const result = await run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "success";
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toBe("success");
    }
  });

  test("returns success with complex objects", async () => {
    const complexObject = { id: 1, data: [1, 2, 3], nested: { value: true } };
    const result = await run(() => complexObject);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toEqual(complexObject);
    }
  });

  test("returns success with null and undefined", async () => {
    const nullResult = await run(() => null);
    expect(nullResult.ok).toBe(true);
    if (nullResult.ok) {
      expect(nullResult.result).toBeNull();
    }

    const undefinedResult = await run(() => undefined);
    expect(undefinedResult.ok).toBe(true);
    if (undefinedResult.ok) {
      expect(undefinedResult.result).toBeUndefined();
    }
  });
});

describe("run - basic failure cases", () => {
  test("returns failure result when callback throws synchronously", async () => {
    const error = new Error("sync error");
    const result = await run(() => {
      throw error;
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(error);
    }
  });

  test("returns failure result when async callback rejects", async () => {
    const error = new Error("async error");
    const result = await run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      throw error;
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(error);
    }
  });

  test("captures non-Error thrown values", async () => {
    const stringError = "something went wrong";
    const result = await run(() => {
      throw stringError;
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(stringError);
    }
  });

  test("captures thrown objects", async () => {
    const errorObject = { code: 500, message: "Internal Error" };
    const result = await run(() => {
      throw errorObject;
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual(errorObject);
    }
  });
});

describe("run - noCatch option", () => {
  test("returns raw value when noCatch is true", async () => {
    const result = await run(() => 42, { noCatch: true });
    expect(result).toBe(42);
  });

  test("returns raw async value when noCatch is true", async () => {
    const result = await run(
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "direct";
      },
      { noCatch: true },
    );
    expect(result).toBe("direct");
  });

  test("throws error when noCatch is true", () => {
    const error = new Error("uncaught");
    expect(
      run(
        () => {
          throw error;
        },
        { noCatch: true },
      ),
    ).rejects.toThrow("uncaught");
  });

  test("throws non-Error values when noCatch is true", () => {
    expect(
      run(
        () => {
          throw "string error";
        },
        { noCatch: true },
      ),
    ).rejects.toBe("string error");
  });
});

describe("run - retry mechanism", () => {
  test("retries on failure when retry callback returns true", async () => {
    let attempts = 0;
    const result = await run(
      () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`attempt ${attempts}`);
        }
        return "success after retries";
      },
      {
        retry: async () => true,
      },
    );

    expect(attempts).toBe(3);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toBe("success after retries");
    }
  });

  test("stops retrying when retry callback returns false", async () => {
    let attempts = 0;
    const result = await run(
      () => {
        attempts++;
        throw new Error(`attempt ${attempts}`);
      },
      {
        retry: async ({ retryNumber }) => retryNumber < 2,
      },
    );

    expect(attempts).toBe(2);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as Error).message).toBe("attempt 2");
    }
  });

  test("passes correct retry number to callback", async () => {
    const retryNumbers: number[] = [];
    await run(
      () => {
        throw new Error("fail");
      },
      {
        retry: ({ retryNumber }) => {
          retryNumbers.push(retryNumber);
          return retryNumber < 3;
        },
      },
    );

    expect(retryNumbers).toEqual([1, 2, 3]);
  });

  test("passes error to retry callback", async () => {
    const errors: unknown[] = [];
    const specificError = new Error("specific error");
    await run(
      () => {
        throw specificError;
      },
      {
        retry: ({ error, retryNumber }) => {
          errors.push(error);
          return retryNumber < 2;
        },
      },
    );

    expect(errors).toHaveLength(2);
    expect(errors[0]).toBe(specificError);
    expect(errors[1]).toBe(specificError);
  });

  test("retry callback can be async", async () => {
    let attempts = 0;
    const result = await run(
      () => {
        attempts++;
        if (attempts < 2) {
          throw new Error("retry me");
        }
        return "success";
      },
      {
        retry: async ({ retryNumber }) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return retryNumber < 5;
        },
      },
    );

    expect(attempts).toBe(2);
    expect(result.ok).toBe(true);
  });

  test("does not retry on success", async () => {
    let retryCallCount = 0;
    const result = await run(() => "immediate success", {
      retry: () => {
        retryCallCount++;
        return true;
      },
    });

    expect(retryCallCount).toBe(0);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toBe("immediate success");
    }
  });

  test("propagates error when retry callback throws", async () => {
    let attempts = 0;
    await expect(
      run(
        () => {
          attempts++;
          throw new Error("original error");
        },
        {
          retry: ({ retryNumber }) => {
            if (retryNumber === 2) {
              throw new Error("retry callback error");
            }
            return true;
          },
        },
      ),
    ).rejects.toThrow("retry callback error");

    expect(attempts).toBe(2);
  });
});

describe("run - retry with noCatch", () => {
  test("retries and throws when noCatch is true", async () => {
    let attempts = 0;
    await expect(
      run(
        () => {
          attempts++;
          throw new Error(`attempt ${attempts}`);
        },
        {
          noCatch: true,
          retry: async ({ retryNumber }) => retryNumber < 2,
        },
      ),
    ).rejects.toThrow("attempt 2");

    expect(attempts).toBe(2);
  });

  test("retries and succeeds when noCatch is true", async () => {
    let attempts = 0;
    const result = await run(
      () => {
        attempts++;
        if (attempts < 2) {
          throw new Error("retry");
        }
        return "final success";
      },
      {
        noCatch: true,
        retry: async () => true,
      },
    );

    expect(attempts).toBe(2);
    expect(result).toBe("final success");
  });
});

describe("run - edge cases", () => {
  test("handles callback that returns Promise.resolve", async () => {
    const result = await run(() => Promise.resolve("resolved"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toBe("resolved");
    }
  });

  test("handles callback that returns Promise.reject", async () => {
    const error = new Error("rejected");
    const result = await run(() => Promise.reject(error));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(error);
    }
  });

  test("handles infinite retry loop protection", async () => {
    let attempts = 0;
    const maxAttempts = 100;

    const result = await run(
      () => {
        attempts++;
        if (attempts > maxAttempts) {
          return "escaped";
        }
        throw new Error("keep trying");
      },
      {
        retry: async () => true,
      },
    );

    expect(attempts).toBe(maxAttempts + 1);
    expect(result.ok).toBe(true);
  });

  test("preserves error stack traces", async () => {
    const result = await run(() => {
      const error = new Error("with stack");
      Error.captureStackTrace(error);
      throw error;
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as Error).stack).toBeDefined();
      expect((result.error as Error).stack).toContain("with stack");
    }
  });

  test("handles callback that modifies external state", async () => {
    const state = { count: 0 };
    const result = await run(() => {
      state.count++;
      return state.count;
    });

    expect(state.count).toBe(1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toBe(1);
    }
  });

  test("handles multiple sequential runs", async () => {
    const results = await Promise.all([
      run(() => 1),
      run(() => 2),
      run(() => 3),
    ]);

    expect(results).toHaveLength(3);
    results.forEach((result, index) => {
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toBe(index + 1);
      }
    });
  });

  test("handles mixed success and failure in parallel", async () => {
    const results = await Promise.all([
      run(() => "success"),
      run(() => {
        throw new Error("fail");
      }),
      run(() => 42),
    ]);

    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(false);
    expect(results[2].ok).toBe(true);
  });

  test("handles zero (falsy but valid return value)", async () => {
    const result = await run(() => 0);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toBe(0);
    }
  });

  test("handles empty string (falsy but valid return value)", async () => {
    const result = await run(() => "");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toBe("");
    }
  });

  test("handles false (falsy but valid return value)", async () => {
    const result = await run(() => false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toBe(false);
    }
  });

  test("handles callback that returns another promise", async () => {
    const innerPromise = Promise.resolve("inner value");
    const result = await run(() => innerPromise);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toBe("inner value");
    }
  });
});

describe("run - retry with different error types", () => {
  test("retries work with string errors", async () => {
    let attempts = 0;
    const result = await run(
      () => {
        attempts++;
        if (attempts < 2) {
          throw "string error";
        }
        return "recovered";
      },
      {
        retry: ({ error, retryNumber }) => {
          expect(error).toBe("string error");
          return retryNumber < 5;
        },
      },
    );

    expect(attempts).toBe(2);
    expect(result.ok).toBe(true);
  });

  test("retries work with number errors", async () => {
    let attempts = 0;
    const result = await run(
      () => {
        attempts++;
        if (attempts < 2) {
          throw 404;
        }
        return "recovered";
      },
      {
        retry: ({ error }) => {
          expect(error).toBe(404);
          return true;
        },
      },
    );

    expect(attempts).toBe(2);
    expect(result.ok).toBe(true);
  });

  test("retries work with null/undefined errors", async () => {
    let attempts = 0;
    const result = await run(
      () => {
        attempts++;
        if (attempts === 1) {
          throw null;
        }
        return "recovered";
      },
      {
        retry: ({ error }) => {
          expect(error).toBeNull();
          return true;
        },
      },
    );

    expect(attempts).toBe(2);
    expect(result.ok).toBe(true);
  });
});

describe("run - complex retry scenarios", () => {
  test("retry can implement exponential backoff", async () => {
    let attempts = 0;
    const delays: number[] = [];

    const result = await run(
      () => {
        attempts++;
        if (attempts < 4) {
          throw new Error("retry");
        }
        return "success";
      },
      {
        retry: async ({ retryNumber }) => {
          const delay = 2 ** retryNumber * 10;
          delays.push(delay);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return retryNumber < 5;
        },
      },
    );

    expect(attempts).toBe(4);
    expect(result.ok).toBe(true);
    expect(delays).toEqual([20, 40, 80]);
  });

  test("retry can conditionally retry based on error type", async () => {
    let attempts = 0;

    class RetryableError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "RetryableError";
      }
    }
    class FatalError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "FatalError";
      }
    }

    const result = await run(
      () => {
        attempts++;
        if (attempts === 1) {
          throw new RetryableError("can retry");
        }
        throw new FatalError("cannot retry");
      },
      {
        retry: ({ error }) => {
          return error instanceof RetryableError;
        },
      },
    );

    expect(attempts).toBe(2);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as Error).name).toBe("FatalError");
    }
  });

  test("retry can implement max attempts limit", async () => {
    let attempts = 0;
    const maxRetries = 3;

    const result = await run(
      () => {
        attempts++;
        throw new Error(`attempt ${attempts}`);
      },
      {
        retry: async ({ retryNumber }) => retryNumber < maxRetries,
      },
    );

    expect(attempts).toBe(maxRetries);
    expect(result.ok).toBe(false);
  });

  test("retry callback receives fresh error on each attempt", async () => {
    let attempts = 0;
    const errors: string[] = [];

    await run(
      () => {
        attempts++;
        throw new Error(`error ${attempts}`);
      },
      {
        retry: ({ error, retryNumber }) => {
          errors.push((error as Error).message);
          return retryNumber < 3;
        },
      },
    );

    expect(errors).toEqual(["error 1", "error 2", "error 3"]);
  });
});
