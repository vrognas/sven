import * as assert from "assert";
import { Uri } from "vscode";
import { Resource } from "../resource";
import { Status, PropStatus } from "../common/types";

suite("Resource Tests", () => {
  test("Create resource - verify resource creation from URI", () => {
    const uri = Uri.file("/test/file.txt");
    const resource = new Resource(uri, Status.MODIFIED);

    assert.strictEqual(resource.resourceUri, uri);
    assert.strictEqual(resource.type, Status.MODIFIED);
    assert.strictEqual(resource.renameResourceUri, undefined);
    assert.strictEqual(resource.props, undefined);
    assert.strictEqual(resource.remote, false);
    assert.strictEqual(resource.letter, "M");
  });

  test("Update resource - verify state updates work", () => {
    const uri = Uri.file("/test/file.txt");
    const renameUri = Uri.file("/test/oldfile.txt");
    const resource = new Resource(
      uri,
      Status.ADDED,
      renameUri,
      PropStatus.MODIFIED
    );

    // Verify properties updated correctly
    assert.strictEqual(resource.resourceUri, uri);
    assert.strictEqual(resource.type, Status.ADDED);
    assert.strictEqual(resource.renameResourceUri, renameUri);
    assert.strictEqual(resource.props, PropStatus.MODIFIED);

    // Verify decorations computed correctly
    const decorations = resource.decorations;
    assert.ok(decorations);
    assert.strictEqual(
      decorations.tooltip,
      "Renamed from oldfile.txt (history preserved)"
    );
    assert.strictEqual(decorations.strikeThrough, false);
  });

  test("Compare resources - verify equality checks", () => {
    const uri1 = Uri.file("/test/file1.txt");
    const uri2 = Uri.file("/test/file2.txt");

    const modified = new Resource(uri1, Status.MODIFIED);
    const deleted = new Resource(uri2, Status.DELETED);
    const added = new Resource(uri1, Status.ADDED);

    // Verify letter property
    assert.strictEqual(modified.letter, "M");
    assert.strictEqual(deleted.letter, "D");
    assert.strictEqual(added.letter, "A");

    // Verify priority
    assert.strictEqual(modified.priority, 2);
    assert.strictEqual(deleted.priority, 4);
    assert.strictEqual(added.priority, 4);

    // Verify strikethrough for deleted
    assert.strictEqual(modified.decorations.strikeThrough, false);
    assert.strictEqual(deleted.decorations.strikeThrough, true);
  });
});
