const trimAndNormalizeWhitespace = (value) => {
  if (typeof value !== "string") {
    return String(value);
  }
  return value.replace(/\s+/g, " ").trim();
};

const safelyParse = (value) => {
  if (value === undefined || value === null) return value;
  const trimmed = String(value).trim();

  if (trimmed === "") return trimmed;

  try {
    return JSON.parse(trimmed);
  } catch (jsonError) {
    try {
      const normalized = trimmed
        .replace(/'/g, '"')
        .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b\s*:/g, '"$1":')
        .replace(/:\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?=[,\]}])/g, ':"$1"')
        .replace(/,\s*([}\]])/g, '$1');

      return JSON.parse(normalized);
    } catch {
      return trimmed;
    }
  }
};

const compareObjects = (a, b) => {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => compareObjects(item, b[index]));
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    return false;
  }

  if (typeof a === "object") {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key, index) => {
      if (key !== bKeys[index]) return false;
      return compareObjects(a[key], b[bKeys[index]]);
    });
  }

  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    return Math.abs(a - b) < Number.EPSILON;
  }

  if (typeof a === "string" && typeof b === "string") {
    return trimAndNormalizeWhitespace(a) === trimAndNormalizeWhitespace(b);
  }

  return a === b;
};

export const compareOutputs = (actualOutput, expectedOutput) => {
  const normalizedActual = trimAndNormalizeWhitespace(actualOutput);
  const normalizedExpected = trimAndNormalizeWhitespace(expectedOutput);

  if (normalizedActual === normalizedExpected) return true;

  const parsedActual = safelyParse(normalizedActual);
  const parsedExpected = safelyParse(normalizedExpected);

  if (typeof parsedActual === "string" || typeof parsedExpected === "string") {
    return trimAndNormalizeWhitespace(String(parsedActual)) === trimAndNormalizeWhitespace(String(parsedExpected));
  }

  return compareObjects(parsedActual, parsedExpected);
};

export default compareOutputs;
