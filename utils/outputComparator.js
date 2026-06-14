const normalizeWhitespace = (value) => {
  const text = typeof value === "string" ? value : String(value ?? "");
  return text.replace(/\r\n/g, "\n").replace(/\t/g, " ").replace(/\s+/g, " ").trim();
};

const normalizeJsonLikeText = (value) => {
  let text = normalizeWhitespace(value);
  text = text.replace(/\bNone\b/g, "null");
  text = text.replace(/\bTrue\b/g, "true");
  text = text.replace(/\bFalse\b/g, "false");
  text = text.replace(/'/g, '"');
  text = text.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b\s*:/g, '"$1":');
  text = text.replace(/:\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?=[,\]}])/g, (match, token) => {
    const normalizedToken = token.toLowerCase();
    if (normalizedToken === 'true' || normalizedToken === 'false' || normalizedToken === 'null') {
      return `: ${normalizedToken}`;
    }
    return `: "${token}"`;
  });
  text = text.replace(/,\s*([}\]])/g, '$1');
  return text;
};

const safelyParse = (value) => {
  if (value === undefined || value === null) return value;
  const trimmed = normalizeWhitespace(value);
  if (trimmed === "") return trimmed;

  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      return JSON.parse(normalizeJsonLikeText(trimmed));
    } catch {
      return trimmed;
    }
  }
};

const compareObjects = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return a === b;

  if (typeof a !== typeof b) {
    if (typeof a === "string" && typeof b === "number") {
      return !Number.isNaN(Number(a)) && Math.abs(Number(a) - b) < Number.EPSILON;
    }
    if (typeof b === "string" && typeof a === "number") {
      return !Number.isNaN(Number(b)) && Math.abs(a - Number(b)) < Number.EPSILON;
    }
    if (typeof a === "string" && typeof b === "boolean") {
      return a.trim().toLowerCase() === String(b).toLowerCase();
    }
    if (typeof b === "string" && typeof a === "boolean") {
      return b.trim().toLowerCase() === String(a).toLowerCase();
    }
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => compareObjects(item, b[index]));
  }

  if (Array.isArray(a) || Array.isArray(b)) return false;

  if (typeof a === "object") {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key, index) => key === bKeys[index] && compareObjects(a[key], b[bKeys[index]]));
  }

  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    return Math.abs(a - b) < Number.EPSILON;
  }

  if (typeof a === "string" && typeof b === "string") {
    return normalizeWhitespace(a) === normalizeWhitespace(b);
  }

  return a === b;
};

export const compareOutputs = (actualOutput, expectedOutput) => {
  const normalizedActual = normalizeWhitespace(actualOutput);
  const normalizedExpected = normalizeWhitespace(expectedOutput);

  if (normalizedActual === normalizedExpected) return true;

  const parsedActual = safelyParse(normalizedActual);
  const parsedExpected = safelyParse(normalizedExpected);

  if (typeof parsedActual === "string" || typeof parsedExpected === "string") {
    return normalizeWhitespace(String(parsedActual)) === normalizeWhitespace(String(parsedExpected));
  }

  return compareObjects(parsedActual, parsedExpected);
};

export default compareOutputs;
