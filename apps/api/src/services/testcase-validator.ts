/**
 * Test case validation and deduplication.
 * Ensures all generated test cases are valid and unique.
 */

export interface TestCase {
  input: string;
  expectedOutput: string;
  category?: string;
  isHidden?: boolean;
}

/**
 * Remove exact duplicate test cases (same input).
 */
export function deduplicateTestCases(testCases: TestCase[]): TestCase[] {
  const seen = new Set<string>();
  const unique: TestCase[] = [];

  for (const tc of testCases) {
    const key = tc.input.trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(tc);
    }
  }

  return unique;
}

/**
 * Validate that a test case's input matches the problem's constraints.
 */
export function validateTestCaseInput(
  input: string,
  constraints: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const trimmed = input.trim();

  if (!trimmed) {
    errors.push('Empty input');
    return { valid: false, errors };
  }

  // Check for common format issues
  if (trimmed.includes('undefined') || trimmed.includes('null')) {
    errors.push('Input contains undefined or null');
  }

  // Check array bounds from constraints
  const arraySizeMatch = trimmed.match(/\[(.*?)\]/);
  if (arraySizeMatch) {
    const elements = arraySizeMatch[1] ? arraySizeMatch[1].split(',').filter(e => e.trim()) : [];
    for (const constraint of constraints) {
      const lengthMatch = constraint.match(/(\d+)\s*<=\s*\w*\.length\s*<=\s*(\d+)/);
      if (lengthMatch) {
        const minLen = parseInt(lengthMatch[1]);
        const maxLen = parseInt(lengthMatch[2]);
        if (elements.length < minLen || elements.length > maxLen) {
          errors.push(`Array length ${elements.length} outside constraint [${minLen}, ${maxLen}]`);
        }
      }
    }
  }

  // Check for NaN values
  const numbers = trimmed.match(/-?\d+\.?\d*/g);
  if (numbers) {
    for (const num of numbers) {
      if (isNaN(parseFloat(num))) {
        errors.push(`Invalid number: ${num}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate expected output format.
 */
export function validateExpectedOutput(
  output: string,
  category: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const trimmed = output.trim();

  if (!trimmed) {
    errors.push('Empty expected output');
    return { valid: false, errors };
  }

  // Common valid output patterns
  const validPatterns = [
    /^-?\d+$/,                           // integer
    /^-?\d+\.\d+$/,                      // float
    /^(true|false)$/,                    // boolean
    /^\[.*\]$/,                          // array
    /^".*"$/,                            // string
    /^'(.*?)'$/,                         // string (single quotes)
    /^\[\[.*\]\]$/,                      // 2D array
    /^[A-Za-z]+$/,                       // word
  ];

  const isNumeric = validPatterns.some(p => p.test(trimmed));
  if (!isNumeric && trimmed.length > 10000) {
    errors.push('Output suspiciously long (possible TLE or infinite loop)');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check test case coverage across categories.
 */
export function checkCoverage(testCases: TestCase[]): {
  coverage: Record<string, number>;
  missing: string[];
  sufficient: boolean;
} {
  const categories = ['basic', 'edge', 'boundary', 'max_constraint', 'adversarial', 'stress', 'worst_case'];
  const coverage: Record<string, number> = {};
  const missing: string[] = [];

  for (const cat of categories) {
    coverage[cat] = testCases.filter(tc => tc.category === cat).length;
    if (coverage[cat] === 0) {
      missing.push(cat);
    }
  }

  const total = testCases.length;
  const hasMinimum = total >= 10; // At least 10 test cases
  const hasCategories = missing.length <= 2; // At most 2 missing categories

  return {
    coverage,
    missing,
    sufficient: hasMinimum && hasCategories,
  };
}

/**
 * Validate all test cases for a problem.
 */
export function validateAllTestCases(
  testCases: TestCase[],
  constraints: string[]
): {
  valid: boolean;
  totalTestCases: number;
  validTestCases: number;
  invalidTestCases: number;
  duplicateTestCases: number;
  coverage: Record<string, number>;
  missingCategories: string[];
  errors: string[];
} {
  const errors: string[] = [];

  // Deduplicate first
  const deduplicated = deduplicateTestCases(testCases);
  const duplicateCount = testCases.length - deduplicated.length;
  if (duplicateCount > 0) {
    errors.push(`Removed ${duplicateCount} duplicate test cases`);
  }

  // Validate each test case
  let validCount = 0;
  let invalidCount = 0;

  for (const tc of deduplicated) {
    const inputValidation = validateTestCaseInput(tc.input, constraints);
    const outputValidation = validateExpectedOutput(tc.expectedOutput, tc.category || 'basic');

    if (inputValidation.valid && outputValidation.valid) {
      validCount++;
    } else {
      invalidCount++;
      errors.push(`Invalid test case: ${[...inputValidation.errors, ...outputValidation.errors].join('; ')}`);
    }
  }

  // Check coverage
  const { coverage, missing } = checkCoverage(deduplicated);

  return {
    valid: invalidCount === 0 && missing.length <= 2,
    totalTestCases: testCases.length,
    validTestCases: validCount,
    invalidTestCases: invalidCount,
    duplicateTestCases: duplicateCount,
    coverage,
    missingCategories: missing,
    errors,
  };
}
