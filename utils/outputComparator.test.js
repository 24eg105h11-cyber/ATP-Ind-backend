import { compareOutputs } from "./outputComparator.js";

const tests = [
  { a: "[0, 1]", b: "[0,1]", expected: true },
  { a: "[1, [2, 3], 4]", b: "[1,[2,3],4]", expected: true },
  { a: "{ \"a\": 1, \"b\": [2,3] }", b: "{\"b\":[2,3],\"a\":1}", expected: true },
  { a: "hello", b: " hello ", expected: true },
  { a: "true", b: "true", expected: true },
  { a: "null", b: "null", expected: true },
  { a: "1.000000", b: "1", expected: true },
  { a: "[1,2,3]", b: "[1,2,4]", expected: false },
  { a: "{a:1}", b: "{\"a\":1}", expected: true },
  { a: "{a: true}", b: "{\"a\":true}", expected: true },
  { a: "[ 0 , 1 ]\n", b: "[0,1]", expected: true },
  { a: "[0, 1]", b: "[0, 1, 2]", expected: false },
  { a: "{ \"x\": 10 }", b: "{ x: 10 }", expected: true },
  { a: "[1, true, null, \"abc\"]", b: "[1,true,null,\"abc\"]", expected: true },
];

let failed = 0;
for (const { a, b, expected } of tests) {
  const result = compareOutputs(a, b);
  if (result !== expected) {
    failed += 1;
    console.error(`FAILED: compareOutputs(${JSON.stringify(a)}, ${JSON.stringify(b)}) => ${result}, expected ${expected}`);
  }
}

if (failed > 0) {
  console.error(`${failed} tests failed.`);
  process.exit(1);
}

console.log("All output comparator tests passed.");
