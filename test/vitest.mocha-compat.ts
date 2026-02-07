import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe as vitestDescribe,
  it as vitestIt,
  test as vitestTest
} from "vitest";

type MochaContext = { timeout: (ms: number) => void };
type Runnable = ((this: MochaContext) => unknown) | ((this: MochaContext, done: (err?: unknown) => void) => void);

const timeoutNoop = () => {
  // Mocha-style timeout API compatibility
};
const SKIP = Symbol("mocha-skip");

const callWithContext = (fn: Runnable) => {
  if (typeof fn !== "function") {
    return undefined;
  }

  const context: MochaContext & { skip: () => never } = {
    timeout: timeoutNoop,
    skip: () => {
      throw SKIP;
    }
  };

  if (fn.length > 0) {
    return new Promise<void>((resolve, reject) => {
      const done = (err?: unknown) => (err ? reject(err) : resolve());
      try {
        (fn as (this: MochaContext, done: (err?: unknown) => void) => void).call(context, done);
      } catch (err) {
        if (err === SKIP) {
          resolve();
        } else {
          reject(err);
        }
      }
    });
  }

  try {
    const result = (fn as (this: MochaContext) => unknown).call(context);
    if (result && typeof (result as Promise<unknown>).then === "function") {
      return (result as Promise<unknown>).catch(err => {
        if (err === SKIP) {
          return undefined;
        }
        throw err;
      });
    }
    return result;
  } catch (err) {
    if (err === SKIP) {
      return undefined;
    }
    throw err;
  }
};

const wrapHook = (register: (cb: () => unknown) => void) => (hook: Runnable) => {
  register(() => callWithContext(hook));
};

const wrapTestFunction = (base: any) => {
  const wrapped = ((name: string, fn?: Runnable, timeout?: number) =>
    base(name, fn ? () => callWithContext(fn) : undefined, timeout)) as any;
  Object.assign(wrapped, base);
  return wrapped;
};

const wrapSuiteFunction = (base: any) => {
  const wrapped = ((name: string, fn?: Runnable) =>
    base(name, fn ? () => callWithContext(fn) : undefined)) as any;
  Object.assign(wrapped, base);
  return wrapped;
};

const wrappedTest = wrapTestFunction(vitestTest);
const wrappedIt = wrapTestFunction(vitestIt);
const wrappedSuite = wrapSuiteFunction(vitestDescribe);

(globalThis as any).setup = wrapHook(beforeEach);
(globalThis as any).teardown = wrapHook(afterEach);
(globalThis as any).suiteSetup = wrapHook(beforeAll);
(globalThis as any).suiteTeardown = wrapHook(afterAll);
(globalThis as any).test = wrappedTest;
(globalThis as any).it = wrappedIt;
(globalThis as any).suite = wrappedSuite;
(globalThis as any).describe = wrappedSuite;
