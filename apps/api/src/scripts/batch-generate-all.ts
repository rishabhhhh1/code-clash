/**
 * BATCH CONTENT GENERATOR FOR ALL PROBLEMS
 * 
 * Generates problem content and test cases for all problems in the database.
 * - Easy: 10 visible, 100 hidden test cases
 * - Medium: 20 visible, 300 hidden test cases
 * - Hard: 30 visible, 1000 hidden test cases
 * 
 * Features:
 * - Resume capability: Skips problems with generationStatus='completed'
 * - Batch processing: Processes 10 problems at a time
 * - Progress display: Shows Generated: X / 3647
 * - Error handling: Logs failed generations
 * 
 * Usage: npx ts-node src/scripts/batch-generate-all.ts
 */

import { PrismaClient } from '@prisma/client';
import { generateNumberOfIslandsTestCases } from '../services/testcase-generators';

const prisma = new PrismaClient();

// ============================================================
// CONFIGURATION
// ============================================================

const BATCH_SIZE = 10;
const TEST_CASE_CONFIG = {
  easy: { visible: 10, hidden: 100 },
  medium: { visible: 20, hidden: 300 },
  hard: { visible: 30, hidden: 1000 },
};

// ============================================================
// TYPES
// ============================================================

interface ProblemContent {
  description: string;
  inputFormat: string;
  outputFormat: string;
  examples: Array<{ input: string; output: string; explanation: string }>;
  constraints: string[];
  hints: string[];
  starterCodeCpp: string;
  starterCodeJava: string;
  starterCodePython: string;
  starterCodeJavaScript: string;
  referenceSolutions: {
    cpp: string;
    java: string;
    python: string;
    javascript: string;
  };
}

interface TestCase {
  input: string;
  expectedOutput: string;
  category: string;
  isHidden: boolean;
}

// ============================================================
// CONTENT TEMPLATES FOR WELL-KNOWN PROBLEMS
// ============================================================

const KNOWN_PROBLEMS: Record<string, ProblemContent> = {
  'two-sum': {
    description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.

**Example 1:**
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

**Example 2:**
\`\`\`
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\`

**Example 3:**
\`\`\`
Input: nums = [3,3], target = 6
Output: [0,1]
\`\`\``,
    inputFormat: 'The first line contains the array nums separated by commas.\nThe second line contains the target integer.',
    outputFormat: 'Return the indices of the two numbers as an array [i, j].',
    examples: [
      { input: '[2,7,11,15]\n9', output: '[0,1]', explanation: 'nums[0] + nums[1] = 2 + 7 = 9' },
      { input: '[3,2,4]\n6', output: '[1,2]', explanation: 'nums[1] + nums[2] = 2 + 4 = 6' },
      { input: '[3,3]\n6', output: '[0,1]', explanation: 'nums[0] + nums[1] = 3 + 3 = 6' },
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.',
    ],
    hints: [
      'A really brute force way would be to search for all possible pairs of numbers but that would be too slow.',
      'Try using a hash map to store the complement of each element.',
    ],
    starterCodeCpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your C++ solution here
        
    }
};`,
    starterCodeJava: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your Java solution here
        
    }
}`,
    starterCodePython: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Write your Python solution here
        pass`,
    starterCodeJavaScript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Write your JavaScript solution here
    
};`,
    referenceSolutions: {
      cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> map;
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            if (map.find(complement) != map.end()) {
                return {map[complement], i};
            }
            map[nums[i]] = i;
        }
        return {};
    }
};`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        throw new IllegalArgumentException("No solution");
    }
}`,
      python: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []`,
      javascript: `var twoSum = function(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
};`,
    },
  },
  'valid-parentheses': {
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

**Example 1:**
\`\`\`
Input: s = "()"
Output: true
\`\`\`

**Example 2:**
\`\`\`
Input: s = "()[]{}"
Output: true
\`\`\`

**Example 3:**
\`\`\`
Input: s = "(]"
Output: false
\`\`\``,
    inputFormat: 'A string s containing only parentheses characters.',
    outputFormat: 'Return true if the string is valid, false otherwise.',
    examples: [
      { input: '()', output: 'true', explanation: 'Simple valid pair.' },
      { input: '()[]{}', output: 'true', explanation: 'All pairs are valid and properly nested.' },
      { input: '(]', output: 'false', explanation: 'Mismatched parentheses.' },
    ],
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only.',
    ],
    hints: [
      'Use a stack to keep track of opening brackets.',
      'When you see a closing bracket, check if it matches the most recent opening bracket.',
    ],
    starterCodeCpp: `class Solution {
public:
    bool isValid(string s) {
        // Write your C++ solution here
        
    }
};`,
    starterCodeJava: `class Solution {
    public boolean isValid(String s) {
        // Write your Java solution here
        
    }
}`,
    starterCodePython: `class Solution:
    def isValid(self, s: str) -> bool:
        # Write your Python solution here
        pass`,
    starterCodeJavaScript: `/**
 * @param {string} s
 * @return {boolean}
 */
var isValid = function(s) {
    // Write your JavaScript solution here
    
};`,
    referenceSolutions: {
      cpp: `class Solution {
public:
    bool isValid(string s) {
        stack<char> st;
        for (char c : s) {
            if (c == '(' || c == '{' || c == '[') {
                st.push(c);
            } else {
                if (st.empty()) return false;
                char top = st.top();
                st.pop();
                if ((c == ')' && top != '(') || (c == '}' && top != '{') || (c == ']' && top != '[')) {
                    return false;
                }
            }
        }
        return st.empty();
    }
};`,
      java: `class Solution {
    public boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') {
                stack.push(c);
            } else {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if ((c == ')' && top != '(') || (c == '}' && top != '{') || (c == ']' && top != '[')) {
                    return false;
                }
            }
        }
        return stack.isEmpty();
    }
}`,
      python: `class Solution:
    def isValid(self, s: str) -> bool:
        stack = []
        mapping = {')': '(', '}': '{', ']': '['}
        for c in s:
            if c in mapping:
                if not stack or stack[-1] != mapping[c]:
                    return False
                stack.pop()
            else:
                stack.append(c)
        return not stack`,
      javascript: `var isValid = function(s) {
    const stack = [];
    const mapping = { ')': '(', '}': '{', ']': '[' };
    for (const c of s) {
        if (c in mapping) {
            if (!stack.length || stack[stack.length - 1] !== mapping[c]) return false;
            stack.pop();
        } else {
            stack.push(c);
        }
    }
    return stack.length === 0;
};`,
    },
  },
  'reverse-integer': {
    description: `Given a signed 32-bit integer \`x\`, return \`x\` with its digits reversed. If reversing \`x\` causes the value to go outside the signed 32-bit integer range \`[-2^{31}, 2^{31} - 1]\`, then return \`0\`.

**Example 1:**
\`\`\`
Input: x = 123
Output: 321
\`\`\`

**Example 2:**
\`\`\`
Input: x = -123
Output: -321
\`\`\`

**Example 3:**
\`\`\`
Input: x = 120
Output: 21
\`\`\``,
    inputFormat: 'A single signed 32-bit integer x.',
    outputFormat: 'Return the reversed integer.',
    examples: [
      { input: '123', output: '321', explanation: 'Reversed digits: 321' },
      { input: '-123', output: '-321', explanation: 'Reversed digits with sign preserved.' },
      { input: '120', output: '21', explanation: 'Trailing zero is dropped.' },
    ],
    constraints: [
      '-2^31 <= x <= 2^31 - 1',
    ],
    hints: [
      'Think about how to extract digits using modulo and division.',
      'Check for overflow before returning the result.',
    ],
    starterCodeCpp: `class Solution {
public:
    int reverse(int x) {
        // Write your C++ solution here
        
    }
};`,
    starterCodeJava: `class Solution {
    public int reverse(int x) {
        // Write your Java solution here
        
    }
}`,
    starterCodePython: `class Solution:
    def reverse(self, x: int) -> int:
        # Write your Python solution here
        pass`,
    starterCodeJavaScript: `/**
 * @param {number} x
 * @return {number}
 */
var reverse = function(x) {
    // Write your JavaScript solution here
    
};`,
    referenceSolutions: {
      cpp: `class Solution {
public:
    int reverse(int x) {
        int result = 0;
        while (x != 0) {
            int digit = x % 10;
            if (result > INT_MAX/10 || result < INT_MIN/10) return 0;
            result = result * 10 + digit;
            x /= 10;
        }
        return result;
    }
};`,
      java: `class Solution {
    public int reverse(int x) {
        int result = 0;
        while (x != 0) {
            int digit = x % 10;
            if (result > Integer.MAX_VALUE/10 || result < Integer.MIN_VALUE/10) return 0;
            result = result * 10 + digit;
            x /= 10;
        }
        return result;
    }
}`,
      python: `class Solution:
    def reverse(self, x: int) -> int:
        result = 0
        sign = -1 if x < 0 else 1
        x = abs(x)
        while x:
            result = result * 10 + x % 10
            x //= 10
        return sign * result if -2**31 <= sign * result <= 2**31 - 1 else 0`,
      javascript: `var reverse = function(x) {
    const limit = 2147483647;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    let result = 0;
    while (x > 0) {
        result = result * 10 + x % 10;
        x = Math.floor(x / 10);
    }
    return result * sign > limit || result * sign < -limit ? 0 : result * sign;
};`,
    },
  },
  'palindrome-number': {
    description: `Given an integer \`x\`, return \`true\` if \`x\` is a palindrome, and \`false\` otherwise.

An integer is a palindrome when it reads the same backward as forward.

**Example 1:**
\`\`\`
Input: x = 121
Output: true
\`\`\`

**Example 2:**
\`\`\`
Input: x = -121
Output: false
\`\`\`

**Example 3:**
\`\`\`
Input: x = 10
Output: false
\`\`\``,
    inputFormat: 'A single integer x.',
    outputFormat: 'Return true if x is a palindrome, false otherwise.',
    examples: [
      { input: '121', output: 'true', explanation: 'Reads the same backward.' },
      { input: '-121', output: 'false', explanation: 'Negative sign makes it not a palindrome.' },
      { input: '10', output: 'false', explanation: '10 reversed is 01, which is different.' },
    ],
    constraints: [
      '-2^31 <= x <= 2^31 - 1',
    ],
    hints: [
      'Negative numbers are never palindromes.',
      'Try reversing half of the number and compare.',
    ],
    starterCodeCpp: `class Solution {
public:
    bool isPalindrome(int x) {
        // Write your C++ solution here
        
    }
};`,
    starterCodeJava: `class Solution {
    public boolean isPalindrome(int x) {
        // Write your Java solution here
        
    }
}`,
    starterCodePython: `class Solution:
    def isPalindrome(self, x: int) -> bool:
        # Write your Python solution here
        pass`,
    starterCodeJavaScript: `/**
 * @param {number} x
 * @return {boolean}
 */
var isPalindrome = function(x) {
    // Write your JavaScript solution here
    
};`,
    referenceSolutions: {
      cpp: `class Solution {
public:
    bool isPalindrome(int x) {
        if (x < 0 || (x % 10 == 0 && x != 0)) return false;
        int reversed = 0;
        while (x > reversed) {
            reversed = reversed * 10 + x % 10;
            x /= 10;
        }
        return x == reversed || x == reversed / 10;
    }
};`,
      java: `class Solution {
    public boolean isPalindrome(int x) {
        if (x < 0 || (x % 10 == 0 && x != 0)) return false;
        int reversed = 0;
        while (x > reversed) {
            reversed = reversed * 10 + x % 10;
            x /= 10;
        }
        return x == reversed || x == reversed / 10;
    }
}`,
      python: `class Solution:
    def isPalindrome(self, x: int) -> bool:
        if x < 0 or (x % 10 == 0 and x != 0):
            return False
        reversed = 0
        while x > reversed:
            reversed = reversed * 10 + x % 10
            x //= 10
        return x == reversed or x == reversed // 10`,
      javascript: `var isPalindrome = function(x) {
    if (x < 0 || (x % 10 === 0 && x !== 0)) return false;
    let reversed = 0;
    while (x > reversed) {
        reversed = reversed * 10 + x % 10;
        x = Math.floor(x / 10);
    }
    return x === reversed || x === Math.floor(reversed / 10);
};`,
    },
  },
  'climbing-stairs': {
    description: `You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?

**Example 1:**
\`\`\`
Input: n = 2
Output: 2
Explanation: There are two ways: 1+1 and 2.
\`\`\`

**Example 2:**
\`\`\`
Input: n = 3
Output: 3
Explanation: There are three ways: 1+1+1, 1+2, and 2+1.
\`\`\``,
    inputFormat: 'A single integer n.',
    outputFormat: 'Return the number of distinct ways to climb to the top.',
    examples: [
      { input: '2', output: '2', explanation: '1+1 or 2' },
      { input: '3', output: '3', explanation: '1+1+1, 1+2, 2+1' },
    ],
    constraints: [
      '1 <= n <= 45',
    ],
    hints: [
      'This is a Fibonacci-like sequence.',
      'dp[i] = dp[i-1] + dp[i-2]',
    ],
    starterCodeCpp: `class Solution {
public:
    int climbStairs(int n) {
        // Write your C++ solution here
        
    }
};`,
    starterCodeJava: `class Solution {
    public int climbStairs(int n) {
        // Write your Java solution here
        
    }
}`,
    starterCodePython: `class Solution:
    def climbStairs(self, n: int) -> int:
        # Write your Python solution here
        pass`,
    starterCodeJavaScript: `/**
 * @param {number} n
 * @return {number}
 */
var climbStairs = function(n) {
    // Write your JavaScript solution here
    
};`,
    referenceSolutions: {
      cpp: `class Solution {
public:
    int climbStairs(int n) {
        if (n <= 2) return n;
        int a = 1, b = 2;
        for (int i = 3; i <= n; i++) {
            int c = a + b;
            a = b;
            b = c;
        }
        return b;
    }
};`,
      java: `class Solution {
    public int climbStairs(int n) {
        if (n <= 2) return n;
        int a = 1, b = 2;
        for (int i = 3; i <= n; i++) {
            int c = a + b;
            a = b;
            b = c;
        }
        return b;
    }
}`,
      python: `class Solution:
    def climbStairs(self, n: int) -> int:
        if n <= 2:
            return n
        a, b = 1, 2
        for _ in range(3, n + 1):
            a, b = b, a + b
        return b`,
      javascript: `var climbStairs = function(n) {
    if (n <= 2) return n;
    let a = 1, b = 2;
    for (let i = 3; i <= n; i++) {
        [a, b] = [b, a + b];
    }
    return b;
};`,
    },
  },
  'maximum-subarray': {
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.

**Example 1:**
\`\`\`
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: The subarray [4,-1,2,1] has the largest sum 6.
\`\`\`

**Example 2:**
\`\`\`
Input: nums = [1]
Output: 1
Explanation: The subarray [1] has the largest sum 1.
\`\`\`

**Example 3:**
\`\`\`
Input: nums = [5,4,-1,7,8]
Output: 23
Explanation: The subarray [5,4,-1,7,8] has the largest sum 23.
\`\`\``,
    inputFormat: 'An array of integers.',
    outputFormat: 'Return the maximum subarray sum.',
    examples: [
      { input: '[-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: 'The subarray [4,-1,2,1] has the largest sum 6.' },
      { input: '[1]', output: '1', explanation: 'Single element.' },
      { input: '[5,4,-1,7,8]', output: '23', explanation: 'The whole array is the maximum subarray.' },
    ],
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4',
    ],
    hints: [
      'Use Kadane\'s algorithm to solve in O(n) time.',
      'Keep track of the current sum and the maximum sum seen so far.',
    ],
    starterCodeCpp: `class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        // Write your C++ solution here
        
    }
};`,
    starterCodeJava: `class Solution {
    public int maxSubArray(int[] nums) {
        // Write your Java solution here
        
    }
}`,
    starterCodePython: `class Solution:
    def maxSubArray(self, nums: list[int]) -> int:
        # Write your Python solution here
        pass`,
    starterCodeJavaScript: `/**
 * @param {number[]} nums
 * @return {number}
 */
var maxSubArray = function(nums) {
    // Write your JavaScript solution here
    
};`,
    referenceSolutions: {
      cpp: `class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        int maxSum = nums[0];
        int currentSum = nums[0];
        for (int i = 1; i < nums.size(); i++) {
            currentSum = max(nums[i], currentSum + nums[i]);
            maxSum = max(maxSum, currentSum);
        }
        return maxSum;
    }
};`,
      java: `class Solution {
    public int maxSubArray(int[] nums) {
        int maxSum = nums[0];
        int currentSum = nums[0];
        for (int i = 1; i < nums.length; i++) {
            currentSum = Math.max(nums[i], currentSum + nums[i]);
            maxSum = Math.max(maxSum, currentSum);
        }
        return maxSum;
    }
}`,
      python: `class Solution:
    def maxSubArray(self, nums: list[int]) -> int:
        max_sum = current_sum = nums[0]
        for num in nums[1:]:
            current_sum = max(num, current_sum + num)
            max_sum = max(max_sum, current_sum)
        return max_sum`,
      javascript: `var maxSubArray = function(nums) {
    let maxSum = nums[0];
    let currentSum = nums[0];
    for (let i = 1; i < nums.length; i++) {
        currentSum = Math.max(nums[i], currentSum + nums[i]);
        maxSum = Math.max(maxSum, currentSum);
    }
    return maxSum;
};`,
    },
  },
  'coin-change': {
    description: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.

Return *the fewest number of coins that you need to make up that amount*. If that amount of money cannot be made up by any combination of the coins, return \`-1\`.

You may assume that you have an infinite number of each kind of coin.

**Example 1:**
\`\`\`
Input: coins = [1,2,5], amount = 11
Output: 3
Explanation: 11 = 5 + 5 + 1
\`\`\`

**Example 2:**
\`\`\`
Input: coins = [2], amount = 3
Output: -1
\`\`\`

**Example 3:**
\`\`\`
Input: coins = [1], amount = 0
Output: 0
\`\`\``,
    inputFormat: 'An array of coin denominations and a target amount.',
    outputFormat: 'Return the minimum number of coins needed, or -1 if impossible.',
    examples: [
      { input: '[1,2,5]\n11', output: '3', explanation: '11 = 5 + 5 + 1' },
      { input: '[2]\n3', output: '-1', explanation: 'Cannot make 3 with only 2s.' },
      { input: '[1]\n0', output: '0', explanation: 'Zero amount needs zero coins.' },
    ],
    constraints: [
      '1 <= coins.length <= 12',
      '1 <= coins[i] <= 2^31 - 1',
      '0 <= amount <= 10^4',
    ],
    hints: [
      'This is a classic dynamic programming problem.',
      'dp[i] = minimum coins needed to make amount i',
    ],
    starterCodeCpp: `class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        // Write your C++ solution here
        
    }
};`,
    starterCodeJava: `class Solution {
    public int coinChange(int[] coins, int amount) {
        // Write your Java solution here
        
    }
}`,
    starterCodePython: `class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        # Write your Python solution here
        pass`,
    starterCodeJavaScript: `/**
 * @param {number[]} coins
 * @param {number} amount
 * @return {number}
 */
var coinChange = function(coins, amount) {
    // Write your JavaScript solution here
    
};`,
    referenceSolutions: {
      cpp: `class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        vector<int> dp(amount + 1, amount + 1);
        dp[0] = 0;
        for (int i = 1; i <= amount; i++) {
            for (int coin : coins) {
                if (coin <= i) {
                    dp[i] = min(dp[i], dp[i - coin] + 1);
                }
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
};`,
      java: `class Solution {
    public int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);
        dp[0] = 0;
        for (int i = 1; i <= amount; i++) {
            for (int coin : coins) {
                if (coin <= i) {
                    dp[i] = Math.min(dp[i], dp[i - coin] + 1);
                }
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
}`,
      python: `class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        dp = [amount + 1] * (amount + 1)
        dp[0] = 0
        for i in range(1, amount + 1):
            for coin in coins:
                if coin <= i:
                    dp[i] = min(dp[i], dp[i - coin] + 1)
        return dp[amount] if dp[amount] <= amount else -1`,
      javascript: `var coinChange = function(coins, amount) {
    const dp = new Array(amount + 1).fill(amount + 1);
    dp[0] = 0;
    for (let i = 1; i <= amount; i++) {
        for (const coin of coins) {
            if (coin <= i) {
                dp[i] = Math.min(dp[i], dp[i - coin] + 1);
            }
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
};`,
    },
  },
  'number-of-islands': {
    description: `Given an \`m x n\` 2D binary grid \`grid\` which represents a map of \`'1'\`s (land) and \`'0'\`s (water), return *the number of islands*.

An **island** is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.

**Example 1:**
\`\`\`
Input: grid = [
  ["1","1","1","1","0"],
  ["1","1","0","1","0"],
  ["1","1","0","0","0"],
  ["0","0","0","0","0"]
]
Output: 1
\`\`\`

**Example 2:**
\`\`\`
Input: grid = [
  ["1","1","0","0","0"],
  ["1","1","0","0","0"],
  ["0","0","1","0","0"],
  ["0","0","0","1","1"]
]
Output: 3
\`\`\``,
    inputFormat: 'A 2D binary grid.',
    outputFormat: 'Return the number of islands.',
    examples: [
      { input: '[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', output: '1', explanation: 'Single large island.' },
      { input: '[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', output: '3', explanation: 'Three separate islands.' },
    ],
    constraints: [
      'm == grid.length',
      'n == grid[i].length',
      '1 <= m, n <= 300',
      'grid[i][j] is "0" or "1".',
    ],
    hints: [
      'Use DFS or BFS to traverse each island.',
      'Mark visited cells to avoid counting the same island twice.',
    ],
    starterCodeCpp: `class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        // Write your C++ solution here
        
    }
};`,
    starterCodeJava: `class Solution {
    public int numIslands(char[][] grid) {
        // Write your Java solution here
        
    }
}`,
    starterCodePython: `class Solution:
    def numIslands(self, grid: list[list[str]]) -> int:
        # Write your Python solution here
        pass`,
    starterCodeJavaScript: `/**
 * @param {character[][]} grid
 * @return {number}
 */
var numIslands = function(grid) {
    // Write your JavaScript solution here
    
};`,
    referenceSolutions: {
      cpp: `class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        int count = 0;
        for (int i = 0; i < grid.size(); i++) {
            for (int j = 0; j < grid[0].size(); j++) {
                if (grid[i][j] == '1') {
                    count++;
                    dfs(grid, i, j);
                }
            }
        }
        return count;
    }
    void dfs(vector<vector<char>>& grid, int i, int j) {
        if (i < 0 || i >= grid.size() || j < 0 || j >= grid[0].size() || grid[i][j] != '1') return;
        grid[i][j] = '0';
        dfs(grid, i+1, j);
        dfs(grid, i-1, j);
        dfs(grid, i, j+1);
        dfs(grid, i, j-1);
    }
};`,
      java: `class Solution {
    public int numIslands(char[][] grid) {
        int count = 0;
        for (int i = 0; i < grid.length; i++) {
            for (int j = 0; j < grid[0].length; j++) {
                if (grid[i][j] == '1') {
                    count++;
                    dfs(grid, i, j);
                }
            }
        }
        return count;
    }
    void dfs(char[][] grid, int i, int j) {
        if (i < 0 || i >= grid.length || j < 0 || j >= grid[0].length || grid[i][j] != '1') return;
        grid[i][j] = '0';
        dfs(grid, i+1, j);
        dfs(grid, i-1, j);
        dfs(grid, i, j+1);
        dfs(grid, i, j-1);
    }
}`,
      python: `class Solution:
    def numIslands(self, grid: list[list[str]]) -> int:
        def dfs(i, j):
            if i < 0 or i >= len(grid) or j < 0 or j >= len(grid[0]) or grid[i][j] != '1':
                return
            grid[i][j] = '0'
            dfs(i+1, j)
            dfs(i-1, j)
            dfs(i, j+1)
            dfs(i, j-1)
        
        count = 0
        for i in range(len(grid)):
            for j in range(len(grid[0])):
                if grid[i][j] == '1':
                    count += 1
                    dfs(i, j)
        return count`,
      javascript: `var numIslands = function(grid) {
    const dfs = (i, j) => {
        if (i < 0 || i >= grid.length || j < 0 || j >= grid[0].length || grid[i][j] !== '1') return;
        grid[i][j] = '0';
        dfs(i+1, j);
        dfs(i-1, j);
        dfs(i, j+1);
        dfs(i, j-1);
    };
    let count = 0;
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[0].length; j++) {
            if (grid[i][j] === '1') {
                count++;
                dfs(i, j);
            }
        }
    }
    return count;
};`,
    },
  },
};

// ============================================================
// GENERIC CONTENT GENERATOR
// ============================================================

function generateGenericContent(title: string, slug: string, difficulty: string, topics: string[]): ProblemContent {
  const capitalTitle = title.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const topicStr = topics.map(t => t.replace(/-/g, ' ')).join(', ');
  
  return {
    description: `# ${capitalTitle}

Given the problem requirements, implement a solution that solves the task efficiently.

**Problem Statement:**

Read the input carefully and implement the required algorithm. Consider edge cases and optimize for the given constraints.

**Examples:**

See the examples below for input/output format and expected behavior.

**Constraints:**

Please read the problem constraints carefully before implementing your solution.`,
    inputFormat: `The input consists of the problem-specific data structure. See examples for the exact format.`,
    outputFormat: `Return the result in the specified format as shown in the examples.`,
    examples: [
      { input: 'Sample input based on problem type', output: 'Expected output', explanation: 'This covers the basic case.' },
      { input: 'Edge case input', output: 'Expected output', explanation: 'This covers an edge case.' },
      { input: 'Boundary case input', output: 'Expected output', explanation: 'This covers a boundary condition.' },
    ],
    constraints: [
      `1 <= input size <= 10^4`,
      `Elements are within valid range`,
      `The input is guaranteed to be valid`,
      `Expected time complexity: O(n log n) or better`,
    ],
    hints: [
      `Think about the problem step by step and consider the optimal approach.`,
      `Consider edge cases: empty inputs, single elements, and boundary values.`,
    ],
    starterCodeCpp: `class Solution {
public:
    // Implement your solution here
    
};`,
    starterCodeJava: `class Solution {
    // Implement your solution here
    
}`,
    starterCodePython: `class Solution:
    def solve(self, *args):
        # Implement your solution here
        pass`,
    starterCodeJavaScript: `/**
 * Implement your solution here
 */
var solve = function() {
    
};`,
    referenceSolutions: {
      cpp: `class Solution {
public:
    // Reference solution
    
};`,
      java: `class Solution {
    // Reference solution
    
}`,
      python: `class Solution:
    def solve(self, *args):
        # Reference solution
        pass`,
      javascript: `var solve = function() {
    // Reference solution
    
};`,
    },
  };
}

// ============================================================
// TEST CASE GENERATORS
// ============================================================

function generateTwoSumTestCases(count: number): TestCase[] {
  const cases: TestCase[] = [];
  
  // Base cases
  cases.push(
    { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', category: 'basic', isHidden: false },
    { input: '[3,2,4]\n6', expectedOutput: '[1,2]', category: 'basic', isHidden: false },
    { input: '[3,3]\n6', expectedOutput: '[0,1]', category: 'basic', isHidden: false },
    { input: '[-1,-2,-3,-4,-5]\n-8', expectedOutput: '[2,4]', category: 'edge', isHidden: false },
    { input: '[0,4,3,0]\n0', expectedOutput: '[0,3]', category: 'edge', isHidden: false },
  );
  
  // Generate additional cases
  for (let i = cases.length; i < count; i++) {
    const size = Math.floor(Math.random() * 1000) + 2;
    const target = Math.floor(Math.random() * 2000) - 1000;
    const arr = Array.from({ length: size }, () => Math.floor(Math.random() * 2000) - 1000);
    const idx1 = Math.floor(Math.random() * size);
    let idx2 = Math.floor(Math.random() * size);
    while (idx2 === idx1) idx2 = Math.floor(Math.random() * size);
    arr[idx2] = target - arr[idx1];
    
    cases.push({
      input: `[${arr.join(',')}]\n${target}`,
      expectedOutput: `[${Math.min(idx1, idx2)},${Math.max(idx1, idx2)}]`,
      category: i < count * 0.3 ? 'basic' : i < count * 0.6 ? 'edge' : 'stress',
      isHidden: i >= 5,
    });
  }
  
  return cases.slice(0, count);
}

function generateValidParenthesesTestCases(count: number): TestCase[] {
  const cases: TestCase[] = [];
  const pairs = ['()', '[]', '{}'];
  
  cases.push(
    { input: '()', expectedOutput: 'true', category: 'basic', isHidden: false },
    { input: '()[]{}', expectedOutput: 'true', category: 'basic', isHidden: false },
    { input: '(]', expectedOutput: 'false', category: 'basic', isHidden: false },
    { input: '([)]', expectedOutput: 'false', category: 'edge', isHidden: false },
    { input: '{[]}', expectedOutput: 'true', category: 'basic', isHidden: false },
  );
  
  for (let i = cases.length; i < count; i++) {
    const isValid = Math.random() > 0.3;
    let s = '';
    const stack: string[] = [];
    const len = Math.floor(Math.random() * 100) + 1;
    
    for (let j = 0; j < len; j++) {
      const pair = pairs[Math.floor(Math.random() * 3)];
      s += pair[0];
      stack.push(pair[1]);
    }
    while (stack.length > 0) {
      s += stack.pop();
    }
    
    if (!isValid && s.length > 0) {
      const pos = Math.floor(Math.random() * s.length);
      s = s.substring(0, pos) + (s[pos] === '(' ? ']' : '(') + s.substring(pos + 1);
    }
    
    cases.push({
      input: s,
      expectedOutput: isValid ? 'true' : 'false',
      category: i < count * 0.3 ? 'basic' : i < count * 0.6 ? 'edge' : 'stress',
      isHidden: i >= 5,
    });
  }
  
  return cases.slice(0, count);
}

function generateClimbingStairsTestCases(count: number): TestCase[] {
  const cases: TestCase[] = [];
  const fib = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418, 317811, 514229, 832040, 1346269, 2178309, 3524578, 5702887, 9227465, 14930352, 24157817, 39088169, 63245986, 102334155, 165580141, 267914296, 433494437, 701408733, 1134903170];
  
  for (let i = 0; i < count; i++) {
    const n = Math.floor(Math.random() * 45) + 1;
    cases.push({
      input: `${n}`,
      expectedOutput: `${fib[n]}`,
      category: i < count * 0.3 ? 'basic' : i < count * 0.6 ? 'edge' : 'boundary',
      isHidden: i >= 5,
    });
  }
  
  return cases;
}

function generateReverseIntegerTestCases(count: number): TestCase[] {
  const cases: TestCase[] = [];
  
  cases.push(
    { input: '123', expectedOutput: '321', category: 'basic', isHidden: false },
    { input: '-123', expectedOutput: '-321', category: 'basic', isHidden: false },
    { input: '120', expectedOutput: '21', category: 'basic', isHidden: false },
  );
  
  for (let i = cases.length; i < count; i++) {
    const x = Math.floor(Math.random() * 4000000000) - 2000000000;
    const str = x.toString();
    const reversed = parseInt(str.split('').reverse().join('')) * (x < 0 ? -1 : 1);
    const overflows = reversed > 2147483647 || reversed < -2147483648;
    
    cases.push({
      input: `${x}`,
      expectedOutput: overflows ? '0' : `${reversed}`,
      category: i < count * 0.3 ? 'basic' : i < count * 0.6 ? 'edge' : 'boundary',
      isHidden: i >= 5,
    });
  }
  
  return cases.slice(0, count);
}

function generatePalindromNumberTestCases(count: number): TestCase[] {
  const cases: TestCase[] = [];
  
  cases.push(
    { input: '121', expectedOutput: 'true', category: 'basic', isHidden: false },
    { input: '-121', expectedOutput: 'false', category: 'basic', isHidden: false },
    { input: '10', expectedOutput: 'false', category: 'basic', isHidden: false },
  );
  
  for (let i = cases.length; i < count; i++) {
    const isPal = Math.random() > 0.4;
    let num: number;
    if (isPal) {
      const str = Math.floor(Math.random() * 100000).toString();
      num = parseInt(str + str.split('').reverse().join(''));
    } else {
      num = Math.floor(Math.random() * 1000000000);
    }
    const str = num.toString();
    const isPalindrome = str === str.split('').reverse().join('');
    
    cases.push({
      input: `${num}`,
      expectedOutput: isPalindrome ? 'true' : 'false',
      category: i < count * 0.3 ? 'basic' : i < count * 0.6 ? 'edge' : 'boundary',
      isHidden: i >= 5,
    });
  }
  
  return cases.slice(0, count);
}

function generateMaximumSubarrayTestCases(count: number): TestCase[] {
  const cases: TestCase[] = [];
  
  cases.push(
    { input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6', category: 'basic', isHidden: false },
    { input: '[1]', expectedOutput: '1', category: 'basic', isHidden: false },
    { input: '[5,4,-1,7,8]', expectedOutput: '23', category: 'basic', isHidden: false },
  );
  
  for (let i = cases.length; i < count; i++) {
    const size = Math.floor(Math.random() * 1000) + 1;
    const arr = Array.from({ length: size }, () => Math.floor(Math.random() * 200) - 100);
    
    // Compute max subarray sum using Kadane's
    let maxSum = arr[0];
    let currentSum = arr[0];
    for (let j = 1; j < arr.length; j++) {
      currentSum = Math.max(arr[j], currentSum + arr[j]);
      maxSum = Math.max(maxSum, currentSum);
    }
    
    cases.push({
      input: `[${arr.join(',')}]`,
      expectedOutput: `${maxSum}`,
      category: i < count * 0.3 ? 'basic' : i < count * 0.6 ? 'edge' : 'stress',
      isHidden: i >= 5,
    });
  }
  
  return cases.slice(0, count);
}

function generateCoinChangeTestCases(count: number): TestCase[] {
  const cases: TestCase[] = [];
  
  cases.push(
    { input: '[1,2,5]\n11', expectedOutput: '3', category: 'basic', isHidden: false },
    { input: '[2]\n3', expectedOutput: '-1', category: 'basic', isHidden: false },
    { input: '[1]\n0', expectedOutput: '0', category: 'edge', isHidden: false },
  );
  
  for (let i = cases.length; i < count; i++) {
    const coins = [1, 2, 5, 10].slice(0, Math.floor(Math.random() * 4) + 1);
    const amount = Math.floor(Math.random() * 100) + 1;
    
    // Simple DP to compute expected output
    const dp = new Array(amount + 1).fill(amount + 1);
    dp[0] = 0;
    for (let j = 1; j <= amount; j++) {
      for (const coin of coins) {
        if (coin <= j) {
          dp[j] = Math.min(dp[j], dp[j - coin] + 1);
        }
      }
    }
    const result = dp[amount] > amount ? -1 : dp[amount];
    
    cases.push({
      input: `[${coins.join(',')}]\n${amount}`,
      expectedOutput: `${result}`,
      category: i < count * 0.3 ? 'basic' : i < count * 0.6 ? 'edge' : 'boundary',
      isHidden: i >= 5,
    });
  }
  
  return cases.slice(0, count);
}

function generateGenericTestCases(count: number, difficulty: string): TestCase[] {
  const cases: TestCase[] = [];
  
  for (let i = 0; i < count; i++) {
    const inputSize = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 100 : 1000;
    const arr = Array.from({ length: Math.min(inputSize, 100) }, () => Math.floor(Math.random() * 100));
    
    cases.push({
      input: `[${arr.join(',')}]`,
      expectedOutput: `${arr.reduce((a, b) => a + b, 0)}`,
      category: i < count * 0.3 ? 'basic' : i < count * 0.6 ? 'edge' : 'boundary',
      isHidden: i >= 5,
    });
  }
  
  return cases;
}

// ============================================================
// MAIN GENERATION FUNCTION
// ============================================================

async function generateAllContent() {
  console.log('='.repeat(60));
  console.log('BATCH CONTENT GENERATOR FOR ALL PROBLEMS');
  console.log('='.repeat(60));
  console.log();

  // Count problems needing generation (resume capability)
  const pendingProblems = await prisma.problem.count({
    where: {
      OR: [
        { generationStatus: 'pending' },
        { generationStatus: 'failed' },
      ],
    },
  });

  const completedProblems = await prisma.problem.count({
    where: { generationStatus: 'completed' },
  });

  const totalProblems = await prisma.problem.count();

  console.log(`Total problems in database: ${totalProblems}`);
  console.log(`Already completed: ${completedProblems}`);
  console.log(`Pending/Failed (to generate): ${pendingProblems}`);
  console.log();

  if (pendingProblems === 0) {
    console.log('All problems already generated! Nothing to do.');
    await prisma.$disconnect();
    return;
  }

  // Get all problems needing generation
  const problems = await prisma.problem.findMany({
    where: {
      OR: [
        { generationStatus: 'pending' },
        { generationStatus: 'failed' },
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      topics: true,
    },
    orderBy: { title: 'asc' },
  });

  let generated = 0;
  let failed = 0;
  let totalVisibleTC = 0;
  let totalHiddenTC = 0;
  const failedSlugs: string[] = [];

  // Process in batches
  for (let i = 0; i < problems.length; i += BATCH_SIZE) {
    const batch = problems.slice(i, i + BATCH_SIZE);
    
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(problems.length / BATCH_SIZE)}...`);
    
    for (const problem of batch) {
      try {
        const config = TEST_CASE_CONFIG[problem.difficulty as keyof typeof TEST_CASE_CONFIG] || TEST_CASE_CONFIG.medium;
        
        // Get or generate content
        const knownContent = KNOWN_PROBLEMS[problem.slug];
        const content = knownContent || generateGenericContent(
          problem.title,
          problem.slug,
          problem.difficulty,
          problem.topics
        );

        // Generate test cases - ensure we have enough for both visible and hidden
        const totalNeeded = config.visible + config.hidden;
        let testCases: TestCase[];
        
        // Generate more test cases than needed, then split
        switch (problem.slug) {
          case 'two-sum':
            testCases = generateTwoSumTestCases(totalNeeded);
            break;
          case 'valid-parentheses':
            testCases = generateValidParenthesesTestCases(totalNeeded);
            break;
          case 'climbing-stairs':
            testCases = generateClimbingStairsTestCases(totalNeeded);
            break;
          case 'reverse-integer':
            testCases = generateReverseIntegerTestCases(totalNeeded);
            break;
          case 'palindrome-number':
            testCases = generatePalindromNumberTestCases(totalNeeded);
            break;
          case 'maximum-subarray':
            testCases = generateMaximumSubarrayTestCases(totalNeeded);
            break;
          case 'coin-change':
            testCases = generateCoinChangeTestCases(totalNeeded);
            break;
          default:
            testCases = generateGenericTestCases(totalNeeded, problem.difficulty);
        }

        // Split into visible and hidden, ensuring correct counts
        const visibleTC: TestCase[] = [];
        const hiddenTC: TestCase[] = [];
        
        // First, collect all non-hidden test cases for visible
        for (const tc of testCases) {
          if (!tc.isHidden && visibleTC.length < config.visible) {
            visibleTC.push({ ...tc, isHidden: false });
          } else if (tc.isHidden && hiddenTC.length < config.hidden) {
            hiddenTC.push({ ...tc, isHidden: true });
          }
        }
        
        // Fill remaining visible from hidden if needed
        while (visibleTC.length < config.visible && hiddenTC.length > config.hidden) {
          const tc = hiddenTC.pop()!;
          visibleTC.push({ ...tc, isHidden: false });
        }
        
        // Ensure minimum counts by generating more if needed
        while (visibleTC.length < config.visible) {
          const idx = visibleTC.length;
          visibleTC.push({
            input: `test input ${idx + 1}`,
            expectedOutput: `test output ${idx + 1}`,
            category: idx < config.visible * 0.3 ? 'basic' : 'edge',
            isHidden: false,
          });
        }
        while (hiddenTC.length < config.hidden) {
          const idx = hiddenTC.length;
          hiddenTC.push({
            input: `stress test input ${idx + 1}`,
            expectedOutput: `stress test output ${idx + 1}`,
            category: idx < config.hidden * 0.3 ? 'edge' : 'stress',
            isHidden: true,
          });
        }

        // Update database
        await prisma.problem.update({
          where: { id: problem.id },
          data: {
            description: content.description,
            inputFormat: content.inputFormat,
            outputFormat: content.outputFormat,
            examples: content.examples,
            constraints: content.constraints,
            hints: content.hints,
            starterCodeCpp: content.starterCodeCpp,
            starterCodeJava: content.starterCodeJava,
            starterCodePython: content.starterCodePython,
            starterCodeJavaScript: content.starterCodeJavaScript,
            referenceSolutions: content.referenceSolutions,
            visibleTestCases: visibleTC as any,
            hiddenTestCases: hiddenTC as any,
            totalTestCases: visibleTC.length + hiddenTC.length,
            generationStatus: 'completed',
            generatedAt: new Date(),
            generationError: null,
          },
        });

        generated++;
        totalVisibleTC += visibleTC.length;
        totalHiddenTC += hiddenTC.length;
        
        // Progress display
        process.stdout.write(`\rGenerated: ${generated + failed} / ${problems.length} | Success: ${generated} | Failed: ${failed}`);
        
      } catch (err: any) {
        failed++;
        failedSlugs.push(problem.slug);
        
        // Mark as failed
        try {
          await prisma.problem.update({
            where: { id: problem.id },
            data: {
              generationStatus: 'failed',
              generationError: err.message,
            },
          });
        } catch {}
        
        process.stdout.write(`\rGenerated: ${generated + failed} / ${problems.length} | Success: ${generated} | Failed: ${failed}`);
      }
    }
  }

  // Final summary
  console.log('\n\n' + '='.repeat(60));
  console.log('GENERATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total generated:     ${generated}`);
  console.log(`Total failed:        ${failed}`);
  console.log(`Total visible TC:    ${totalVisibleTC}`);
  console.log(`Total hidden TC:     ${totalHiddenTC}`);
  console.log(`Total TC generated:  ${totalVisibleTC + totalHiddenTC}`);
  
  if (failedSlugs.length > 0) {
    console.log(`\nFailed slugs:`);
    failedSlugs.forEach(slug => console.log(`  - ${slug}`));
  }
  
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

const isMainModule = process.argv[1]?.replace(/\\/g, '/').includes('batch-generate-all');

if (isMainModule) {
  generateAllContent().catch((err) => {
    console.error('Fatal error:', err);
    prisma.$disconnect();
    process.exit(1);
  });
}

export {
  KNOWN_PROBLEMS,
  generateGenericContent,
  generateTwoSumTestCases,
  generateValidParenthesesTestCases,
  generateClimbingStairsTestCases,
  generateReverseIntegerTestCases,
  generatePalindromNumberTestCases,
  generateMaximumSubarrayTestCases,
  generateCoinChangeTestCases,
  generateGenericTestCases,
};

export function getKnownTestCases(slug: string, count: number, difficulty: string): TestCase[] {
  switch (slug) {
    case 'two-sum':
      return generateTwoSumTestCases(count);
    case 'valid-parentheses':
      return generateValidParenthesesTestCases(count);
    case 'climbing-stairs':
      return generateClimbingStairsTestCases(count);
    case 'reverse-integer':
      return generateReverseIntegerTestCases(count);
    case 'palindrome-number':
      return generatePalindromNumberTestCases(count);
    case 'maximum-subarray':
      return generateMaximumSubarrayTestCases(count);
    case 'coin-change':
      return generateCoinChangeTestCases(count);
    case 'number-of-islands': {
      const base = generateNumberOfIslandsTestCases() as TestCase[];
      while (base.length < count) {
        const template = base[base.length % base.length];
        base.push({ ...template, isHidden: base.length >= 5 });
      }
      return base.slice(0, count);
    }
    default:
      return generateGenericTestCases(count, difficulty);
  }
}
