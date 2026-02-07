import * as assert from "assert";
import { describe, it } from "mocha";
import {
  RemoteChangeService,
  RemoteChangeConfig
} from "../../../services/RemoteChangeService";

/**
 * RemoteChangeService E2E Tests
 *
 * Tests actual polling behavior without mocking:
 * - Timer lifecycle (start/stop)
 * - Callback invocation at intervals
 * - Error resilience
 */
describe("RemoteChangeService E2E", () => {
  function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error(`Timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise.then(
        value => {
          clearTimeout(timeoutHandle);
          resolve(value);
        },
        err => {
          clearTimeout(timeoutHandle);
          reject(err);
        }
      );
    });
  }

  /**
   * Test 1: Start polling - verify timer starts and calls update
   */
  it("start polling invokes callback at configured intervals", async () => {
    let callCount = 0;
    const config: RemoteChangeConfig = { checkFrequencySeconds: 0.05 }; // 50ms

    const service = new RemoteChangeService(
      async () => {
        callCount++;
      },
      () => config
    );

    service.start();
    assert.strictEqual(
      service.isRunning,
      true,
      "Service should be running after start"
    );

    // Wait for ~2 intervals (100ms) to verify multiple calls
    await new Promise(resolve => setTimeout(resolve, 220));

    assert.ok(callCount >= 2, `Expected >=2 calls in 120ms, got ${callCount}`);

    service.dispose();
  });

  /**
   * Test 2: Stop polling - verify timer stops and cleans up
   */
  it("stop polling prevents further callback invocations", async () => {
    let callCount = 0;
    const config: RemoteChangeConfig = { checkFrequencySeconds: 0.05 }; // 50ms

    const service = new RemoteChangeService(
      async () => {
        callCount++;
      },
      () => config
    );

    service.start();
    await new Promise(resolve => setTimeout(resolve, 60)); // Wait for first call
    const countAfterStart = callCount;

    service.stop();
    assert.strictEqual(
      service.isRunning,
      false,
      "Service should not be running after stop"
    );

    await new Promise(resolve => setTimeout(resolve, 100)); // Wait to verify no more calls

    assert.strictEqual(
      callCount,
      countAfterStart,
      `No new calls after stop (was ${countAfterStart}, now ${callCount})`
    );

    service.dispose();
  });

  /**
   * Test 3: Error handling - verify errors don't crash polling
   */
  it("polling continues after callback errors", async () => {
    let callCount = 0;
    const config: RemoteChangeConfig = { checkFrequencySeconds: 0.05 }; // 50ms
    let resolveSecondPoll: (() => void) | undefined;
    const secondPollSeen = new Promise<void>(resolve => {
      resolveSecondPoll = resolve;
    });

    const service = new RemoteChangeService(
      async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Simulated polling error");
        }
        if (callCount === 2) {
          resolveSecondPoll?.();
        }
      },
      () => config
    );

    service.start();
    await withTimeout(secondPollSeen, 2000);

    assert.ok(
      callCount >= 2,
      `Polling should continue after error, got ${callCount} calls`
    );
    assert.strictEqual(
      service.isRunning,
      true,
      "Service should still be running after error"
    );

    service.dispose();
  });
});
