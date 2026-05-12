import { XMLParser } from 'fast-xml-parser';
import { deepDiff } from '../deepDiff.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  trimValues: true,
  parseTagValue: true,
  cdataPropName: '__cdata',
});

export function diffXml(textA, textB) {
  try {
    const objA = parser.parse(textA);
    const objB = parser.parse(textB);
    return { ok: true, diffs: deepDiff(objA, objB) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
