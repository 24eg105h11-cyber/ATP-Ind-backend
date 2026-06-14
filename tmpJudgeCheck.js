import { executeCode } from './utils/executor.js';
import { compareOutputs } from './utils/outputComparator.js';

const test = async () => {
  const code = `class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]`;
  const result = await executeCode('twoSum', 'python', code, '[1,2]\n3');
  console.log('execution result:', result);
  const expected = '[0,1]';
  console.log('compareOutputs =>', compareOutputs(result.output, expected));
};

await test();
