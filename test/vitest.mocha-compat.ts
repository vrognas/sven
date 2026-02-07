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
type Runnable =
  | ((this: MochaContext) => unknown)
  | ((this: MochaContext, done: (err?: unknown) => void) => void);
type WrappedTestFn = ((
  name: string,
  fn?: () => unknown,
  timeout?: number
) => unknown) &
  Record<string, unknown>;
type WrappedSuiteFn = ((name: string, fn?: () => unknown) => unknown) &
  Record<string, unknown>;
type MochaCompatGlobals = {
  setup: (hook: Runnable) => void;
  teardown: (hook: Runnable) => void;
  suiteSetup: (hook: Runnable) => void;
  suiteTeardown: (hook: Runnable) => void;
  test: (name: string, fn?: Runnable, timeout?: number) => unknown;
  it: (name: string, fn?: Runnable, timeout?: number) => unknown;
  suite: (name: string, fn?: Runnable) => unknown;
  describe: (name: string, fn?: Runnable) => unknown;
};

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
        (
          fn as (this: MochaContext, done: (err?: unknown) => void) => void
        ).call(context, done);
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

const wrapHook =
  (register: (cb: () => unknown) => void) => (hook: Runnable) => {
    register(() => callWithContext(hook));
  };

const wrapTestFunction = (base: WrappedTestFn) => {
  const wrapped = ((name: string, fn?: Runnable, timeout?: number) =>
    base(
      name,
      fn ? () => callWithContext(fn) : undefined,
      timeout
    )) as WrappedTestFn;
  Object.assign(wrapped, base);
  return wrapped;
};

const wrapSuiteFunction = (base: WrappedSuiteFn) => {
  const wrapped = ((name: string, fn?: Runnable) =>
    base(name, fn ? () => callWithContext(fn) : undefined)) as WrappedSuiteFn;
  Object.assign(wrapped, base);
  return wrapped;
};

const wrappedTest = wrapTestFunction(vitestTest as WrappedTestFn);
const wrappedIt = wrapTestFunction(vitestIt as WrappedTestFn);
const wrappedSuite = wrapSuiteFunction(vitestDescribe as WrappedSuiteFn);

const mochaGlobals = globalThis as typeof globalThis & MochaCompatGlobals;
mochaGlobals.setup = wrapHook(beforeEach);
mochaGlobals.teardown = wrapHook(afterEach);
mochaGlobals.suiteSetup = wrapHook(beforeAll);
mochaGlobals.suiteTeardown = wrapHook(afterAll);
mochaGlobals.test = wrappedTest;
mochaGlobals.it = wrappedIt;
mochaGlobals.suite = wrappedSuite;
mochaGlobals.describe = wrappedSuite;
