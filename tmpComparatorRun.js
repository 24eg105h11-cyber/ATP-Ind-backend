import { compareOutputs } from './utils/outputComparator.js';

const cases = [
  ['[0, 1]', '[0,1]'],
  ['[0, 1]\n', '[0,1]'],
  ['[0,1]\n', '[0, 1]'],
  ['[0,1] ', '[0,1]'],
  ['[0,1]', '[0,  1]'],
  ['{"a":1}', '{ a: 1 }'],
  ['true', 'true'],
  ['null', 'null'],
  ['1.0', '1'],
  ['[ 0 , 1 ]', '[0,1]'],
  ['[0,1]', '[0, 1]'],
];

for (const [a, b] of cases) {
  console.log(`${JSON.stringify(a)} vs ${JSON.stringify(b)} => ${compareOutputs(a, b)}`);
}
