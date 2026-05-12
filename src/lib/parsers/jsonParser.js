import { deepDiff } from '../deepDiff.js';

export function diffJson(textA, textB) {
  try {
    const objA = JSON.parse(textA);
    const objB = JSON.parse(textB);
    return { ok: true, diffs: deepDiff(objA, objB) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
