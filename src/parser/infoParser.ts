import * as xml2js from "xml2js";
import { ISvnInfo } from "../common/types";
import { xml2jsParseSettings } from "../common/constants";

export async function parseInfoXml(content: string): Promise<ISvnInfo> {
  return new Promise<ISvnInfo>((resolve, reject) => {
    xml2js.parseString(
      content,
      xml2jsParseSettings,
      (err, result) => {
        if (err || typeof result.entry === "undefined") {
          reject();
        }

        resolve(result.entry);
      }
    );
  });
}
