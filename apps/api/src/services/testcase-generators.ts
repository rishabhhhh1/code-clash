/**
 * Algorithmic test case generators for common problem types.
 * These generate deterministic, correct test cases without AI.
 * Used as a supplement to AI-generated test cases.
 */

export interface TestCase {
  input: string;
  expectedOutput: string;
  category: 'basic' | 'edge' | 'boundary' | 'max_constraint' | 'adversarial' | 'stress' | 'worst_case';
}

// --- Utility random with seed for reproducibility ---
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// --- Array Generators ---
export function generateRandomArray(n: number, min: number, max: number, seed: number): number[] {
  const rng = seededRandom(seed);
  return Array.from({ length: n }, () => Math.floor(rng() * (max - min + 1)) + min);
}

export function generateSortedArray(n: number, seed: number): number[] {
  const rng = seededRandom(seed);
  const arr: number[] = [];
  let val = Math.floor(rng() * 10);
  for (let i = 0; i < n; i++) {
    arr.push(val);
    val += Math.floor(rng() * 5);
  }
  return arr;
}

export function generateReverseSortedArray(n: number, seed: number): number[] {
  return generateSortedArray(n, seed).reverse();
}

export function generateArrayWithDuplicates(n: number, maxVal: number, seed: number): number[] {
  const rng = seededRandom(seed);
  return Array.from({ length: n }, () => Math.floor(rng() * maxVal));
}

// --- Two Sum Generator ---
export function generateTwoSumTestCases(): TestCase[] {
  const cases: TestCase[] = [];

  // Edge cases
  cases.push({ input: '[1,1]\n2', expectedOutput: '[0,1]', category: 'edge' });
  cases.push({ input: '[-1,-2,-3,-4,-5]\n-8', expectedOutput: '[2,4]', category: 'edge' });
  cases.push({ input: '[0,4,3,0]\n0', expectedOutput: '[0,3]', category: 'edge' });

  // Basic cases
  cases.push({ input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', category: 'basic' });
  cases.push({ input: '[3,2,4]\n6', expectedOutput: '[1,2]', category: 'basic' });
  cases.push({ input: '[3,3]\n6', expectedOutput: '[0,1]', category: 'basic' });

  // Boundary
  cases.push({ input: `${Array.from({length: 10000}, (_, i) => i + 1).join(',')}\n19999`, expectedOutput: '[9998,9999]', category: 'boundary' });

  // Stress (large array, answer at end)
  const largeArr = Array.from({ length: 30000 }, (_, i) => i + 1);
  cases.push({ input: `${largeArr.join(',')}\n59999`, expectedOutput: '[29998,29999]', category: 'stress' });

  // Adversarial (negative numbers, large range)
  cases.push({ input: `${Array.from({length: 10000}, (_, i) => i - 5000).join(',')}\n-1`, expectedOutput: '[4999,5000]', category: 'adversarial' });

  return cases;
}

// --- Valid Parentheses Generator ---
export function generateValidParenthesesTestCases(): TestCase[] {
  const cases: TestCase[] = [];

  cases.push({ input: '()', expectedOutput: 'true', category: 'basic' });
  cases.push({ input: '()[]{}', expectedOutput: 'true', category: 'basic' });
  cases.push({ input: '(]', expectedOutput: 'false', category: 'basic' });
  cases.push({ input: '([)]', expectedOutput: 'false', category: 'basic' });
  cases.push({ input: '{[]}', expectedOutput: 'true', category: 'basic' });
  cases.push({ input: '', expectedOutput: 'true', category: 'edge' });
  cases.push({ input: '(', expectedOutput: 'false', category: 'edge' });
  cases.push({ input: ')', expectedOutput: 'false', category: 'edge' });
  cases.push({ input: '((((', expectedOutput: 'false', category: 'boundary' });
  cases.push({ input: '))))', expectedOutput: 'false', category: 'boundary' });
  cases.push({ input: '()'.repeat(5000), expectedOutput: 'true', category: 'stress' });
  cases.push({ input: '(()'.repeat(3333) + ')', expectedOutput: 'true', category: 'adversarial' });

  return cases;
}

// --- Binary Search Generator ---
export function generateBinarySearchTestCases(): TestCase[] {
  const cases: TestCase[] = [];

  cases.push({ input: '[-1,0,3,5,9,12]\n9', expectedOutput: '4', category: 'basic' });
  cases.push({ input: '[-1,0,3,5,9,12]\n2', expectedOutput: '-1', category: 'basic' });
  cases.push({ input: '[5]\n5', expectedOutput: '0', category: 'edge' });
  cases.push({ input: '[5]\n-1', expectedOutput: '-1', category: 'edge' });

  // Boundary: large sorted array
  const largeSorted = Array.from({ length: 10000 }, (_, i) => i * 2);
  cases.push({ input: `[${largeSorted.join(',')}]\n${largeSorted[5000]}`, expectedOutput: '5000', category: 'boundary' });

  // Adversarial: target at boundaries
  cases.push({ input: `[${largeSorted.join(',')}]\n0`, expectedOutput: '0', category: 'adversarial' });
  cases.push({ input: `[${largeSorted.join(',')}]\n19998`, expectedOutput: '9999', category: 'adversarial' });

  // Stress
  const stressArr = Array.from({ length: 100000 }, (_, i) => i);
  cases.push({ input: `[${stressArr.join(',')}]\n99999`, expectedOutput: '99999', category: 'stress' });

  return cases;
}

// --- Maximum Subarray (Kadane) Generator ---
export function generateMaxSubarrayTestCases(): TestCase[] {
  const cases: TestCase[] = [];

  cases.push({ input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6', category: 'basic' });
  cases.push({ input: '[1]', expectedOutput: '1', category: 'basic' });
  cases.push({ input: '[5,4,-1,7,8]', expectedOutput: '23', category: 'basic' });
  cases.push({ input: '[-1]', expectedOutput: '-1', category: 'edge' });
  cases.push({ input: '[-2,-1]', expectedOutput: '-1', category: 'edge' });
  cases.push({ input: `[${Array.from({length: 10000}, () => Math.floor(Math.random() * 200 - 100)).join(',')}]`, expectedOutput: 'computed', category: 'boundary' });
  cases.push({ input: `[${Array.from({length: 100000}, () => Math.floor(Math.random() * 200 - 100)).join(',')}]`, expectedOutput: 'computed', category: 'stress' });

  return cases;
}

// --- Coin Change Generator ---
export function generateCoinChangeTestCases(): TestCase[] {
  const cases: TestCase[] = [];

  cases.push({ input: '[1,2,5]\n11', expectedOutput: '3', category: 'basic' });
  cases.push({ input: '[2]\n3', expectedOutput: '-1', category: 'basic' });
  cases.push({ input: '[1]\n0', expectedOutput: '0', category: 'edge' });
  cases.push({ input: '[1]\n1', expectedOutput: '1', category: 'edge' });
  cases.push({ input: '[1,2,5]\n100', expectedOutput: '20', category: 'boundary' });
  cases.push({ input: '[186,419,83,408]\n6249', expectedOutput: '20', category: 'adversarial' });

  return cases;
}

// --- Number of Islands Generator ---
export function generateNumberOfIslandsTestCases(): TestCase[] {
  const cases: TestCase[] = [];

  cases.push({ input: '[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', expectedOutput: '1', category: 'basic' });
  cases.push({ input: '[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', expectedOutput: '3', category: 'basic' });
  cases.push({ input: '[["0"]]', expectedOutput: '0', category: 'edge' });
  cases.push({ input: '[["1"]]', expectedOutput: '1', category: 'edge' });
  cases.push({ input: '[["1","0"],["0","1"]]', expectedOutput: '2', category: 'edge' });

  return cases;
}

// --- 3Sum Generator ---
export function generateThreeSumTestCases(): TestCase[] {
  const cases: TestCase[] = [];

  cases.push({ input: '[-1,0,1,2,-1,-4]', expectedOutput: '[[-1,-1,2],[-1,0,1]]', category: 'basic' });
  cases.push({ input: '[0,1,1]', expectedOutput: '[]', category: 'basic' });
  cases.push({ input: '[0,0,0]', expectedOutput: '[[0,0,0]]', category: 'edge' });
  cases.push({ input: '[-2,0,1,1,2]', expectedOutput: '[[-2,0,2],[-2,1,1]]', category: 'basic' });
  cases.push({ input: `[-1000,0,1000,${Array.from({length: 2997}, (_, i) => i - 1498).join(',')}]`, expectedOutput: '[[-1000,0,1000]]', category: 'boundary' });

  return cases;
}

// --- Container With Most Water Generator ---
export function generateContainerWithMostWaterTestCases(): TestCase[] {
  const cases: TestCase[] = [];

  cases.push({ input: '[1,8,6,2,5,4,8,3,7]', expectedOutput: '49', category: 'basic' });
  cases.push({ input: '[1,1]', expectedOutput: '1', category: 'edge' });
  cases.push({ input: '[4,3,2,1,4]', expectedOutput: '16', category: 'basic' });
  cases.push({ input: '[1,2,1]', expectedOutput: '2', category: 'basic' });

  // Adversarial: descending heights
  cases.push({ input: `[${Array.from({length: 100000}, (_, i) => 100000 - i).join(',')}]`, expectedOutput: '2499975000', category: 'adversarial' });

  return cases;
}

// --- Merge K Sorted Lists Generator ---
export function generateMergeKSortedListsTestCases(): TestCase[] {
  const cases: TestCase[] = [];

  cases.push({ input: '[[1,4,5],[1,3,4],[2,6]]', expectedOutput: '[1,1,2,3,4,4,5,6]', category: 'basic' });
  cases.push({ input: '[]', expectedOutput: '[]', category: 'edge' });
  cases.push({ input: '[[]]', expectedOutput: '[]', category: 'edge' });
  cases.push({ input: '[[1]]', expectedOutput: '[1]', category: 'edge' });
  cases.push({ input: `[[${Array.from({length: 500}, (_, i) => i).join(',')}],[${Array.from({length: 500}, (_, i) => i + 500).join(',')}],[${Array.from({length: 500}, (_, i) => i + 1000).join(',')}]]`, expectedOutput: `[${Array.from({length: 1500}, (_, i) => i).join(',')}]`, category: 'boundary' });

  return cases;
}

// --- Trapping Rain Water Generator ---
export function generateTrappingRainWaterTestCases(): TestCase[] {
  const cases: TestCase[] = [];

  cases.push({ input: '[0,1,0,2,1,0,1,3,2,1,2,1]', expectedOutput: '6', category: 'basic' });
  cases.push({ input: '[4,2,0,3,2,5]', expectedOutput: '9', category: 'basic' });
  cases.push({ input: '[1]', expectedOutput: '0', category: 'edge' });
  cases.push({ input: '[1,1]', expectedOutput: '0', category: 'edge' });
  cases.push({ input: '[5,4,3,2,1]', expectedOutput: '0', category: 'adversarial' });
  cases.push({ input: '[1,2,3,4,5]', expectedOutput: '0', category: 'adversarial' });

  return cases;
}

// --- Longest Substring Without Repeating Characters ---
export function generateLongestSubstringTestCases(): TestCase[] {
  const cases: TestCase[] = [];

  cases.push({ input: '"abcabcbb"', expectedOutput: '3', category: 'basic' });
  cases.push({ input: '"bbbbb"', expectedOutput: '1', category: 'basic' });
  cases.push({ input: '"pwwkew"', expectedOutput: '3', category: 'basic' });
  cases.push({ input: '""', expectedOutput: '0', category: 'edge' });
  cases.push({ input: '"a"', expectedOutput: '1', category: 'edge' });
  cases.push({ input: '"au"', expectedOutput: '2', category: 'edge' });
  cases.push({ input: `"${'a'.repeat(50000)}"`, expectedOutput: '1', category: 'stress' });
  cases.push({ input: `"${Array.from({length: 50000}, (_, i) => String.fromCharCode(97 + (i % 26))).join('')}"`, expectedOutput: '26', category: 'adversarial' });

  return cases;
}

// --- Generic Array Problem Generator ---
export function generateGenericArrayTestCases(
  n: number,
  minVal: number,
  maxVal: number
): TestCase[] {
  const cases: TestCase[] = [];
  const seed = 42;

  // Edge cases
  cases.push({ input: `[]`, expectedOutput: '[]', category: 'edge' });
  cases.push({ input: `[${minVal}]`, expectedOutput: `[${minVal}]`, category: 'edge' });
  cases.push({ input: `[${maxVal}]`, expectedOutput: `[${maxVal}]`, category: 'edge' });

  // Basic
  const basic = generateRandomArray(10, minVal, maxVal, seed);
  cases.push({ input: `[${basic.join(',')}]`, expectedOutput: 'to_be_computed', category: 'basic' });

  // Boundary
  const boundary = generateRandomArray(n, minVal, maxVal, seed + 1);
  cases.push({ input: `[${boundary.join(',')}]`, expectedOutput: 'to_be_computed', category: 'boundary' });

  // Adversarial: all same elements
  cases.push({ input: `[${Array(n).fill(Math.floor((minVal + maxVal) / 2)).join(',')}]`, expectedOutput: 'to_be_computed', category: 'adversarial' });

  // Adversarial: sorted
  const sorted = generateSortedArray(n, seed + 2);
  cases.push({ input: `[${sorted.join(',')}]`, expectedOutput: 'to_be_computed', category: 'adversarial' });

  // Adversarial: reverse sorted
  cases.push({ input: `[${sorted.reverse().join(',')}]`, expectedOutput: 'to_be_computed', category: 'worst_case' });

  // Stress
  const stress = generateRandomArray(n * 10, minVal, maxVal, seed + 3);
  cases.push({ input: `[${stress.join(',')}]`, expectedOutput: 'to_be_computed', category: 'stress' });

  return cases;
}

// --- Lookup table for known problem types ---
export const KNOWN_PROBLEM_GENERATORS: Record<string, () => TestCase[]> = {
  'two-sum': generateTwoSumTestCases,
  'valid-parentheses': generateValidParenthesesTestCases,
  'binary-search': generateBinarySearchTestCases,
  'maximum-subarray': generateMaxSubarrayTestCases,
  'coin-change': generateCoinChangeTestCases,
  'number-of-islands': generateNumberOfIslandsTestCases,
  '3sum': generateThreeSumTestCases,
  'container-with-most-water': generateContainerWithMostWaterTestCases,
  'merge-k-sorted-lists': generateMergeKSortedListsTestCases,
  'trapping-rain-water': generateTrappingRainWaterTestCases,
  'longest-substring-without-repeating': generateLongestSubstringTestCases,
};

/**
 * Get algorithmically generated test cases for a problem if available.
 * Returns null if no generator exists for this problem.
 */
export function getAlgorithmicTestCases(slug: string): TestCase[] | null {
  const generator = KNOWN_PROBLEM_GENERATORS[slug];
  return generator ? generator() : null;
}
