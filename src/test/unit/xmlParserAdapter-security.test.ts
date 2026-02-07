import * as assert from "assert";
import { vi } from "vitest";
import { XmlParserAdapter } from "../../parser/xmlParserAdapter";
import { configuration } from "../../helpers/configuration";

suite("XmlParserAdapter - Security Tests", () => {
  teardown(() => {
    vi.restoreAllMocks();
  });

  test("rejects oversized XML", () => {
    const originalMaxSize = (XmlParserAdapter as any).MAX_XML_SIZE;
    (XmlParserAdapter as any).MAX_XML_SIZE = 64;
    try {
      const xml = `<entry>${"A".repeat(128)}</entry>`;
      assert.throws(() => {
        XmlParserAdapter.parse(xml, {});
      }, /maximum size/i);
    } finally {
      (XmlParserAdapter as any).MAX_XML_SIZE = originalMaxSize;
    }
  });

  test("rejects excessive tag count when configured", () => {
    vi.spyOn(configuration, "get").mockImplementation(
      (section: string, defaultValue?: unknown) => {
        if (section === "performance.maxXmlTags") {
          return 5 as never;
        }
        return defaultValue as never;
      }
    );

    const xml = "<root><a/><b/><c/><d/><e/><f/></root>";
    assert.throws(() => {
      XmlParserAdapter.parse(xml, {});
    }, /maximum tag count/i);
  });

  test("rejects deeply nested XML", () => {
    let xml = '<?xml version="1.0"?><root>';
    for (let i = 0; i < 120; i++) {
      xml += "<n>";
    }
    for (let i = 0; i < 120; i++) {
      xml += "</n>";
    }
    xml += "</root>";

    assert.throws(() => {
      XmlParserAdapter.parse(xml, { camelcase: true });
    }, /maximum depth|nesting/i);
  });

  test("rejects empty XML", () => {
    assert.throws(() => {
      XmlParserAdapter.parse("   ", {});
    }, /empty/i);
  });

  test("blocks XXE payload without external entity content", () => {
    const xxe = `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<entry>&xxe;</entry>`;

    try {
      const result = XmlParserAdapter.parse(xxe, {});
      assert.ok(!JSON.stringify(result).includes("/etc/passwd"));
    } catch (err) {
      assert.ok(err instanceof Error);
    }
  });

  test("sanitizes null bytes from parsed output", () => {
    const xml = `<entry path="file\u0000.txt">test\u0000</entry>`;
    const result = XmlParserAdapter.parse(xml, { mergeAttrs: true });
    assert.ok(!JSON.stringify(result).includes("\u0000"));
  });
});
