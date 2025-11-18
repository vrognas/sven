import * as assert from "assert";
import * as sinon from "sinon";
import { Uri } from "vscode";
import { BlameProvider } from "../blame/blameProvider";
import { blameConfiguration } from "../blame/blameConfiguration";
import { blameStateManager } from "../blame/blameStateManager";
import { Repository } from "../repository";
import { ISvnBlameLine } from "../common/types";

suite("BlameProvider E2E Tests", () => {
  let provider: BlameProvider;
  let mockRepository: sinon.SinonStubbedInstance<Repository>;
  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
    mockRepository = sandbox.createStubInstance(Repository);
  });

  teardown(() => {
    if (provider) {
      provider.dispose();
    }
    sandbox.restore();
  });

  test("shows gutter decorations when blame enabled", async () => {
    // Arrange
    const testUri = Uri.file("/test/file.txt");
    const blameData: ISvnBlameLine[] = [
      { lineNumber: 1, revision: "1234", author: "john", date: "2025-11-18T10:00:00Z" },
      { lineNumber: 2, revision: "1235", author: "jane", date: "2025-11-18T11:00:00Z" }
    ];

    mockRepository.blame.resolves(blameData);

    // Create provider
    provider = new BlameProvider(mockRepository as any);
    provider.activate();

    // Enable blame for file
    blameStateManager.setBlameEnabled(testUri, true);
    sandbox.stub(blameConfiguration, "isGutterEnabled").returns(true);
    sandbox.stub(blameConfiguration, "isEnabled").returns(true);

    // Create mock editor
    const mockEditor = {
      document: { uri: testUri, lineCount: 2 },
      setDecorations: sandbox.stub(),
      visibleRanges: [{ start: { line: 0 }, end: { line: 2 } }]
    } as any;

    // Act
    await provider.updateDecorations(mockEditor);

    // Assert
    assert.ok(mockRepository.blame.calledOnce, "Repository.blame() should be called");
    assert.ok(mockEditor.setDecorations.calledOnce, "Editor decorations should be set");
    const decorations = mockEditor.setDecorations.firstCall.args[1];
    assert.strictEqual(decorations.length, 2, "Should have 2 decorations");
  });

  test("hides decorations when blame disabled", async () => {
    // Arrange
    const testUri = Uri.file("/test/file.txt");

    provider = new BlameProvider(mockRepository as any);
    provider.activate();

    // Disable blame
    blameStateManager.setBlameEnabled(testUri, false);
    sandbox.stub(blameConfiguration, "isGutterEnabled").returns(true);
    sandbox.stub(blameConfiguration, "isEnabled").returns(true);

    const mockEditor = {
      document: { uri: testUri, lineCount: 2 },
      setDecorations: sandbox.stub(),
      visibleRanges: [{ start: { line: 0 }, end: { line: 2 } }]
    } as any;

    // Act
    await provider.updateDecorations(mockEditor);

    // Assert
    assert.ok(mockRepository.blame.notCalled, "Repository.blame() should not be called");
    assert.ok(mockEditor.setDecorations.calledOnce, "Should clear decorations");
    const decorations = mockEditor.setDecorations.firstCall.args[1];
    assert.strictEqual(decorations.length, 0, "Should have 0 decorations (cleared)");
  });

  test("updates decorations on file save", async () => {
    // Arrange
    const testUri = Uri.file("/test/file.txt");
    const initialBlame: ISvnBlameLine[] = [
      { lineNumber: 1, revision: "1234", author: "john", date: "2025-11-18T10:00:00Z" }
    ];
    const updatedBlame: ISvnBlameLine[] = [
      { lineNumber: 1, revision: "1236", author: "jane", date: "2025-11-18T12:00:00Z" }
    ];

    mockRepository.blame
      .onFirstCall().resolves(initialBlame)
      .onSecondCall().resolves(updatedBlame);

    provider = new BlameProvider(mockRepository as any);
    provider.activate();

    blameStateManager.setBlameEnabled(testUri, true);
    sandbox.stub(blameConfiguration, "isGutterEnabled").returns(true);
    sandbox.stub(blameConfiguration, "isEnabled").returns(true);

    const mockEditor = {
      document: { uri: testUri, lineCount: 1 },
      setDecorations: sandbox.stub(),
      visibleRanges: [{ start: { line: 0 }, end: { line: 1 } }]
    } as any;

    // Act - Initial load
    await provider.updateDecorations(mockEditor);

    // Simulate file save by invalidating cache and updating
    provider.clearCache(testUri);
    await provider.updateDecorations(mockEditor);

    // Assert
    assert.strictEqual(mockRepository.blame.callCount, 2, "Should fetch blame twice (initial + after save)");
    assert.strictEqual(mockEditor.setDecorations.callCount, 2, "Should update decorations twice");
  });
});
