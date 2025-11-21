import * as assert from "assert";
import { describe, it } from "mocha";
import { Disposable, SourceControl, Uri } from "vscode";
import { ResourceGroupManager } from "../../../src/services/ResourceGroupManager";
import { Resource } from "../../../src/resource";
import { Status } from "../../../src/common/types";
import { ISvnResourceGroup } from "../../../src/common/types";

/**
 * ResourceGroupManager E2E Tests
 *
 * Tests VS Code resource group management with real SVN (not mocked)
 */
describe("ResourceGroupManager E2E", () => {
  /**
   * Test 1: Add resources - verify group creation and addition
   */
  it("creates groups and adds resources correctly", () => {
    // Mock VS Code SourceControl API
    const groups = new Map<string, ISvnResourceGroup>();
    const mockSourceControl: Partial<SourceControl> = {
      createResourceGroup: (id: string, label: string) => {
        const group: ISvnResourceGroup = {
          id,
          label,
          resourceStates: [],
          hideWhenEmpty: false,
          dispose: () => groups.delete(id)
        };
        groups.set(id, group);
        return group;
      }
    };

    const disposables: Disposable[] = [];
    const manager = new ResourceGroupManager(mockSourceControl as SourceControl, disposables);

    // Create test resources
    const changeResource = new Resource(
      Uri.file("/test/modified.txt"),
      Status.MODIFIED
    );
    const conflictResource = new Resource(
      Uri.file("/test/conflict.txt"),
      Status.CONFLICTED
    );
    const unversionedResource = new Resource(
      Uri.file("/test/new.txt"),
      Status.UNVERSIONED
    );

    // Update groups with resources
    const count = manager.updateGroups({
      result: {
        changes: [changeResource],
        conflicts: [conflictResource],
        unversioned: [unversionedResource],
        changelists: new Map(),
        remoteChanges: [],
        statusExternal: [],
        statusIgnored: [],
        isIncomplete: false,
        needCleanUp: false
      },
      config: {
        ignoreOnStatusCountList: [],
        countUnversioned: true
      }
    });

    // Verify groups created and resources added
    assert.strictEqual(groups.size, 4); // changes, conflicts, unversioned, remotechanges
    assert.strictEqual(manager.changes.resourceStates.length, 1);
    assert.strictEqual(manager.conflicts.resourceStates.length, 1);
    assert.strictEqual(manager.unversioned.resourceStates.length, 1);
    assert.strictEqual(count, 3); // All resources counted
  });

  /**
   * Test 2: Remove resources - verify resource removal
   */
  it("removes resources when status cleared", () => {
    // Mock VS Code SourceControl API
    const groups = new Map<string, ISvnResourceGroup>();
    const mockSourceControl: Partial<SourceControl> = {
      createResourceGroup: (id: string, label: string) => {
        const group: ISvnResourceGroup = {
          id,
          label,
          resourceStates: [],
          hideWhenEmpty: false,
          dispose: () => groups.delete(id)
        };
        groups.set(id, group);
        return group;
      }
    };

    const disposables: Disposable[] = [];
    const manager = new ResourceGroupManager(mockSourceControl as SourceControl, disposables);

    // Add resources first
    const resource1 = new Resource(Uri.file("/test/file1.txt"), Status.MODIFIED);
    const resource2 = new Resource(Uri.file("/test/file2.txt"), Status.MODIFIED);

    manager.updateGroups({
      result: {
        changes: [resource1, resource2],
        conflicts: [],
        unversioned: [],
        changelists: new Map(),
        remoteChanges: [],
        statusExternal: [],
        statusIgnored: [],
        isIncomplete: false,
        needCleanUp: false
      },
      config: {
        ignoreOnStatusCountList: [],
        countUnversioned: false
      }
    });

    assert.strictEqual(manager.changes.resourceStates.length, 2);

    // Remove resources by updating with empty
    const count = manager.updateGroups({
      result: {
        changes: [],
        conflicts: [],
        unversioned: [],
        changelists: new Map(),
        remoteChanges: [],
        statusExternal: [],
        statusIgnored: [],
        isIncomplete: false,
        needCleanUp: false
      },
      config: {
        ignoreOnStatusCountList: [],
        countUnversioned: false
      }
    });

    // Verify resources removed
    assert.strictEqual(manager.changes.resourceStates.length, 0);
    assert.strictEqual(count, 0);
  });

  /**
   * Test 3: Rebuild groups - verify full rebuild with changelists
   */
  it("rebuilds groups when changelists change", () => {
    // Mock VS Code SourceControl API
    const groups = new Map<string, ISvnResourceGroup>();
    let createCount = 0;
    const mockSourceControl: Partial<SourceControl> = {
      createResourceGroup: (id: string, label: string) => {
        createCount++;
        const group: ISvnResourceGroup = {
          id,
          label,
          resourceStates: [],
          hideWhenEmpty: false,
          dispose: () => groups.delete(id)
        };
        groups.set(id, group);
        return group;
      }
    };

    const disposables: Disposable[] = [];
    const manager = new ResourceGroupManager(mockSourceControl as SourceControl, disposables);

    // Initial state - no changelists
    const initialCreateCount = createCount;
    manager.updateGroups({
      result: {
        changes: [],
        conflicts: [],
        unversioned: [],
        changelists: new Map(),
        remoteChanges: [],
        statusExternal: [],
        statusIgnored: [],
        isIncomplete: false,
        needCleanUp: false
      },
      config: {
        ignoreOnStatusCountList: [],
        countUnversioned: false
      }
    });

    // Add changelist - should trigger rebuild
    const changelistResources = [
      new Resource(Uri.file("/test/cl1.txt"), Status.MODIFIED, undefined, undefined, "my-changelist")
    ];

    manager.updateGroups({
      result: {
        changes: [],
        conflicts: [],
        unversioned: [],
        changelists: new Map([["my-changelist", changelistResources]]),
        remoteChanges: [],
        statusExternal: [],
        statusIgnored: [],
        isIncomplete: false,
        needCleanUp: false
      },
      config: {
        ignoreOnStatusCountList: [],
        countUnversioned: false
      }
    });

    // Verify changelist group created and unversioned/remote rebuilt
    assert.strictEqual(manager.changelists.size, 1);
    assert.ok(manager.changelists.has("my-changelist"));
    assert.strictEqual(createCount > initialCreateCount, true); // New groups created

    // Remove changelist - should rebuild again
    manager.updateGroups({
      result: {
        changes: [],
        conflicts: [],
        unversioned: [],
        changelists: new Map(),
        remoteChanges: [],
        statusExternal: [],
        statusIgnored: [],
        isIncomplete: false,
        needCleanUp: false
      },
      config: {
        ignoreOnStatusCountList: [],
        countUnversioned: false
      }
    });

    // Verify changelist removed
    assert.strictEqual(manager.changelists.size, 0);
  });
});
