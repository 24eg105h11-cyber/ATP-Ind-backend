export const defaultProblems = [
  {
    title: "Two Sum",
    description: "Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target.",
    difficulty: "easy",
    tags: ["array", "hash table"],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "Only one valid answer exists."
    ],
    templateKey: "twoSum",
    testcases: [
      { input: "[2,7,11,15]\n9", expectedOutput: "[0,1]", isSample: true },
      { input: "[3,2,4]\n6", expectedOutput: "[1,2]", isSample: false },
      { input: "[3,3]\n6", expectedOutput: "[0,1]", isSample: false }
    ]
  },
  {
    title: "Running Sum of 1D Array",
    description: "Given an array nums, return the running sum of nums. The running sum is the sum of all elements from the start of the array up to the current index.",
    difficulty: "easy",
    tags: ["array", "prefix sum"],
    constraints: [
      "1 <= nums.length <= 1000",
      "-10^4 <= nums[i] <= 10^4"
    ],
    templateKey: "runningSum",
    testcases: [
      { input: "[1,2,3,4]", expectedOutput: "[1,3,6,10]", isSample: true },
      { input: "[1,1,1,1,1]", expectedOutput: "[1,2,3,4,5]", isSample: false },
      { input: "[3,1,2,10,1]", expectedOutput: "[3,4,6,16,17]", isSample: false }
    ]
  },
  {
    title: "Product of Array Except Self",
    description: "Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].",
    difficulty: "medium",
    tags: ["array", "prefix product"],
    constraints: [
      "2 <= nums.length <= 10^5",
      "-30 <= nums[i] <= 30",
      "The product of any prefix or suffix is guaranteed to fit in a 32-bit integer."
    ],
    templateKey: "productExceptSelf",
    testcases: [
      { input: "[1,2,3,4]", expectedOutput: "[24,12,8,6]", isSample: true },
      { input: "[-1,1,0,-3,3]", expectedOutput: "[0,0,9,0,0]", isSample: false },
      { input: "[2,3,4,5]", expectedOutput: "[60,40,30,24]", isSample: false }
    ]
  },
  {
    title: "Plus One",
    description: "Given a non-empty array of decimal digits representing a non-negative integer, increment one to the integer and return the resulting array of digits.",
    difficulty: "easy",
    tags: ["array", "math"],
    constraints: [
      "1 <= digits.length <= 100",
      "0 <= digits[i] <= 9",
      "digits does not contain any leading 0s"
    ],
    templateKey: "plusOne",
    testcases: [
      { input: "[1,2,3]", expectedOutput: "[1,2,4]", isSample: true },
      { input: "[4,3,2,1]", expectedOutput: "[4,3,2,2]", isSample: false },
      { input: "[9]", expectedOutput: "[1,0]", isSample: false }
    ]
  },
  {
    title: "Two Sum II - Input Array Is Sorted",
    description: "Given a 1-indexed array of integers numbers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number. Return the indices of the two numbers (1-indexed) as an array of length 2.",
    difficulty: "easy",
    tags: ["array", "two pointers", "binary search"],
    constraints: [
      "2 <= numbers.length <= 3 * 10^4",
      "-1000 <= numbers[i] <= 1000",
      "The tests are generated such that there is exactly one solution"
    ],
    templateKey: "twoSum",
    testcases: [
      { input: "[2,7,11,15]\n9", expectedOutput: "[1,2]", isSample: true },
      { input: "[2,3,4]\n6", expectedOutput: "[1,3]", isSample: false },
      { input: "[-1,0]\n-1", expectedOutput: "[1,2]", isSample: false }
    ]
  }
];
