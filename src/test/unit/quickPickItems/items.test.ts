import * as assert from "assert";
import { Uri } from "vscode";
import { Status } from "../../../common/types";
import ChangeListItem from "../../../quickPickItems/changeListItem";
import { FileItem } from "../../../quickPickItems/fileItem";
import FolderItem from "../../../quickPickItems/folderItem";
import IgnoredChangeListItem from "../../../quickPickItems/ignoredChangeListItem";
import NewChangeListItem from "../../../quickPickItems/newChangeListItem";
import NewFolderItem from "../../../quickPickItems/newFolderItem";
import ParentFolderItem from "../../../quickPickItems/parentFolderItem";
import RemoveChangeListItem from "../../../quickPickItems/removeChangeListItem";
import { Resource } from "../../../resource";

suite("quickPickItems", () => {
  test("ChangeListItem exposes label/id/description/resourceGroup", () => {
    const group = {
      id: "changelist-feature-123",
      label: 'Changelist "feature-123"'
    } as any;
    const item = new ChangeListItem(group);

    assert.strictEqual(item.label, "feature-123");
    assert.strictEqual(item.id, "changelist-feature-123");
    assert.strictEqual(item.description, 'Changelist "feature-123"');
    assert.strictEqual(item.resourceGroup, group);
  });

  test("FileItem resolves relative label from repository", () => {
    const repository = {
      repository: {
        removeAbsolutePath: (p: string) => p.replace("/repo/", "")
      }
    } as any;
    const state = new Resource(Uri.file("/repo/src/file.ts"), Status.MODIFIED);
    const item = new FileItem(repository, state);

    assert.strictEqual(item.label, "src/file.ts");
    assert.strictEqual(item.description, "/repo/src/file.ts");
    assert.strictEqual(item.state, state);
    assert.strictEqual(item.picked, false);
  });

  test("FolderItem computes label/path/description", () => {
    const dir = {
      name: "subdir",
      commit: {
        revision: "42",
        author: "alice",
        date: "2026-02-01T10:00:00.000000Z"
      }
    } as any;
    const item = new FolderItem(dir, "branches");

    assert.strictEqual(item.path, "branches/subdir");
    assert.ok(item.label.includes("$(file-directory)") || item.branch);
    assert.ok(item.description.includes("r42"));
    assert.ok(item.description.includes("alice"));
  });

  test("New/Remove/Ignored changelist items expose static text", () => {
    const newItem = new NewChangeListItem();
    const removeItem = new RemoveChangeListItem();
    const ignoredItem = new IgnoredChangeListItem("legacy");

    assert.strictEqual(newItem.label, "$(plus) New changelist");
    assert.strictEqual(newItem.description, "Create a new change list");
    assert.strictEqual(removeItem.label, "$(dash) Remove changelist");
    assert.strictEqual(removeItem.description, "Remove changelist of file(s)");
    assert.strictEqual(ignoredItem.label, "legacy");
    assert.strictEqual(ignoredItem.description, "Ignored on commit");
  });

  test("Parent/New folder items expose static text", () => {
    const parentItem = new ParentFolderItem("branches/team-a");
    const newFolderItem = new NewFolderItem("branches/team-a");

    assert.strictEqual(
      parentItem.label,
      "$(arrow-left) back to /branches/team-a"
    );
    assert.strictEqual(parentItem.description, "Back to parent");
    assert.strictEqual(newFolderItem.label, "$(plus) Create new branch");
    assert.strictEqual(
      newFolderItem.description,
      'Create new branch in "branches/team-a"'
    );
  });
});
