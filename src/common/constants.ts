import { camelcase } from "../util";

export const xml2jsParseSettings = {
  mergeAttrs: true,
  explicitRoot: false,
  explicitArray: false,
  attrNameProcessors: [camelcase],
  tagNameProcessors: [camelcase],
  // XXE Protection: Disable DOCTYPE processing and static entity parsing
  // to prevent XML External Entity attacks
  doctype: false
};
