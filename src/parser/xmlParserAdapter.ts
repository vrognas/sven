import { XMLParser } from "fast-xml-parser";
import { camelcase } from "../util";

interface ParseOptions {
  mergeAttrs?: boolean;
  explicitArray?: boolean;
  explicitRoot?: boolean;
  camelcase?: boolean;
}

/**
 * XML Parser Adapter providing xml2js-compatible parsing using fast-xml-parser
 *
 * Implements key xml2js behaviors:
 * - mergeAttrs: Merge XML attributes into parent object
 * - explicitArray: Control single vs array element wrapping
 * - explicitRoot: Include/exclude root element (false strips root)
 * - camelcase: Transform tag and attribute names to camelCase
 */
export class XmlParserAdapter {
  /**
   * Create fast-xml-parser instance with configuration
   */
  private static createFxpParser(): XMLParser {
    return new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      ignoreDeclaration: true,
      trimValues: true,
      parseAttributeValue: false,
      parseTagValue: true,
      processEntities: false, // XXE protection
      allowBooleanAttributes: true
    });
  }

  /**
   * Recursively transform object keys to camelCase
   */
  private static toCamelCase(obj: any): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.toCamelCase(item));
    }

    const result: any = {};
    for (const key in obj) {
      const camelKey = camelcase(key);
      result[camelKey] = this.toCamelCase(obj[key]);
    }
    return result;
  }

  /**
   * Merge attributes (prefixed with @_) into parent object
   * Mimics xml2js mergeAttrs: true behavior
   */
  private static mergeAttributes(obj: any): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.mergeAttributes(item));
    }

    const result: any = {};
    let hasTextNode = false;
    let textNodeValue: any = null;

    // First pass: merge attributes and identify text nodes
    for (const key in obj) {
      if (key.startsWith("@_")) {
        // Merge attribute into parent (strip @_ prefix)
        const attrName = key.substring(2);
        result[attrName] = obj[key];
      } else if (key === "#text") {
        hasTextNode = true;
        textNodeValue = obj[key];
      } else {
        result[key] = this.mergeAttributes(obj[key]);
      }
    }

    // If only text node exists, return text value directly
    if (hasTextNode && Object.keys(result).length === 0) {
      return textNodeValue;
    }

    // If text node exists with other properties, keep it as #text
    if (hasTextNode) {
      result["#text"] = textNodeValue;
    }

    return result;
  }

  /**
   * Normalize arrays based on explicitArray: false behavior
   * Single-element arrays become objects, unless already array
   */
  private static normalizeArrays(obj: any): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      // Keep arrays as-is, but normalize their contents
      return obj.map(item => this.normalizeArrays(item));
    }

    const result: any = {};
    for (const key in obj) {
      const value = obj[key];

      // Recursively process the value first
      const processed = this.normalizeArrays(value);

      // If it's an array with single element, unwrap it
      if (Array.isArray(processed) && processed.length === 1) {
        result[key] = processed[0];
      } else {
        result[key] = processed;
      }
    }
    return result;
  }

  /**
   * Strip root element if explicitRoot: false
   * Mimics xml2js explicitRoot: false behavior
   */
  private static stripRootElement(obj: any): any {
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
      return obj;
    }

    const keys = Object.keys(obj);
    // If single root element, return its value
    if (keys.length === 1) {
      return obj[keys[0]];
    }

    return obj;
  }

  /**
   * Parse XML string with xml2js-compatible output
   *
   * @param xml XML string to parse
   * @param options Parsing options
   * @returns Parsed object matching xml2js structure
   */
  public static parse(xml: string, options: ParseOptions = {}): any {
    const parser = this.createFxpParser();
    let result = parser.parse(xml);

    // Apply transformations in order
    if (options.mergeAttrs) {
      result = this.mergeAttributes(result);
    }

    // Strip root element if explicitRoot: false (default behavior)
    if (options.explicitRoot === false) {
      result = this.stripRootElement(result);
    }

    if (options.camelcase) {
      result = this.toCamelCase(result);
    }

    if (options.explicitArray === false) {
      result = this.normalizeArrays(result);
    }

    return result;
  }
}
