# Problem Content Sync Guide

This guide explains how to sync problem content from LeetCode for problems that were imported from CSV with missing data.

## Background

The initial problem import from CSV only included basic metadata (ID, title, difficulty, link, topics, acceptance rate, likes, dislikes). The detailed problem content (description, examples, constraints, starter code, test cases) was missing.

## Sync Methods

### Method 1: Admin Dashboard (Recommended for small batches)

1. Navigate to `/admin` in your browser
2. Click on the "Sync" tab
3. View the count of problems missing content
4. Use the batch sync buttons to sync problems in batches of 10, 20, 50, or 100
5. Optionally filter by difficulty (easy, medium, hard)
6. Monitor the sync progress in real-time

### Method 2: CLI Script (Recommended for full sync)

Run the sync script from the API directory:

```bash
cd apps/api
npm run sync:all
```

**Options:**
- `--limit <number>`: Maximum number of problems to sync (default: all)
- `--difficulty <string>`: Filter by difficulty (easy, medium, hard)
- `--force`: Sync all problems, even those with content
- `--batch-size <number>`: Number of problems per batch (default: 20)
- `--help`: Show help message

**Examples:**

```bash
# Sync all problems with missing content
npm run sync:all

# Sync first 100 problems
npm run sync:all --limit 100

# Sync only easy problems
npm run sync:all --difficulty easy

# Force sync all problems (even those with content)
npm run sync:all --force

# Sync with custom batch size
npm run sync:all --batch-size 50
```

### Method 3: API Endpoints

#### Single Problem Sync
```bash
POST /api/admin/problems/:id/sync-leetcode
```

#### Batch Sync
```bash
POST /api/admin/problems/sync-leetcode-batch
Content-Type: application/json

{
  "limit": 20,
  "difficulty": "easy",
  "force": false
}
```

#### Get Missing Content Problems
```bash
GET /api/admin/problems/missing-content?difficulty=easy
```

## What Gets Synced

The sync service fetches the following from LeetCode:
- **Description**: Full problem statement in markdown format
- **Examples**: Input/output examples with explanations
- **Constraints**: Problem constraints
- **Hints**: Problem hints (if available)
- **Topics**: Problem topic tags
- **Starter Code**: Language-specific starter code templates
- **Function Signature**: Expected function signature
- **Input/Output Format**: Input and output specifications
- **Stats**: Acceptance rate, difficulty, likes, dislikes

## Rate Limiting

The sync script includes a 500ms delay between requests to avoid rate limiting by LeetCode. If you encounter rate limit errors, increase the delay in the script or reduce the batch size.

## Verification

After syncing, verify the content by:
1. Checking the Admin Dashboard "Problems" tab - the "Content" column should show "Complete"
2. Visiting a problem page - it should display the full description, examples, and constraints
3. Testing the Run/Submit buttons - they should work with the synced test cases

## Troubleshooting

### Sync Fails for a Problem
- Some problems may not be available on LeetCode (premium, archived, etc.)
- Check the error message in the sync results
- You can manually sync individual problems via the Admin Dashboard

### Rate Limit Errors
- Reduce the batch size
- Increase the delay between requests in the sync script
- Wait a few minutes and retry

### Content Still Missing After Sync
- The problem may not exist on LeetCode
- The problem may be premium-only
- Check the problem link in the database to verify it exists

## Database Schema

The sync service updates the following fields in the `Problem` table:
- `description`: Full problem statement
- `inputFormat`: Input format specification
- `outputFormat`: Output format specification
- `examples`: Array of example test cases
- `constraints`: Array of constraint strings
- `hints`: Array of hints
- `topics`: Array of topic tags
- `starterCodeCpp`: C++ starter code
- `starterCodeJava`: Java starter code
- `starterCodePython`: Python starter code
- `starterCodeJavaScript`: JavaScript starter code
- `functionSignature`: Expected function signature
- `metaInfo`: Additional metadata

## Next Steps

After syncing problems:
1. Verify the problem pages display content correctly
2. Test the Run and Submit functionality
3. Check that the judge service is working
4. Monitor the leaderboard updates on accepted submissions

## Support

If you encounter issues:
1. Check the API logs for error messages
2. Verify your LeetCode GraphQL endpoint is accessible
3. Ensure the database connection is working
4. Check the admin dashboard sync results for detailed error information
