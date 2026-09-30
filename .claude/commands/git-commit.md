---
description: Commit current changes with an AI-generated message
allowed-tools: Bash
---

Commit all current changes to git with a well-crafted commit message.

## Instructions

1. Run `git status` to see all changes (staged and unstaged)
2. Run `git diff` to review the actual changes
3. Check for command parameters:
    - If user provided parameters (e.g., `/commit-git #123: fix login bug`), parse them
    - Extract task/issue number and description from parameters
    - Parameter formats supported:
        * `/commit-git #123: description` - GitHub issue format
        * `/commit-git task-456: description` - Task ID format
        * `/commit-git PROJ-789: description` - JIRA-style format
    - If no parameters, proceed with context analysis
4. Analyze the current Claude Code session context:
    - Review the conversation history to understand what was worked on
    - Identify the goals and tasks completed during this session
    - Check for mentions of issue numbers, bug reports, or task IDs in the conversation
    - Use this context to write meaningful commit messages
5. Determine commit strategy:
    - **Single commit**: If all changes relate to one logical task
    - **Multiple commits**: If changes span different features/fixes that should be separate
    - When splitting: Group related files by logical change (e.g., separate "feat" from "fix", or separate features)
6. For each commit, generate a message with structured bullet points:

   **Title Line:**
    - Format: `<type>: <description>` or `<type>: <description> (#issue)`
    - Types:
        * `feat:` - New feature
        * `fix:` - Bug fix
        * `docs:` - Documentation changes
        * `style:` - Code style/formatting (no logic changes)
        * `refactor:` - Code refactoring
        * `test:` - Adding or updating tests
        * `devops:` - DevOps, CI/CD, deployment, and infrastructure
        * `deps:` - Dependency updates
        * `config:` - Configuration file changes
        * `maint:` - General maintenance tasks
        * `perf:` - Performance improvements
    - Description: Concise summary in imperative mood
    - Keep under 72 characters (excluding issue reference)
    - Include issue reference if applicable: `feat: add export feature (#123)`

   **Message Body (use structured bullet points):**
    - Add blank line after title
    - Group related changes into sections with headers
    - Use bullet points (`-`) for each specific change
    - Section headers can include counts: `"New Features Added (3):"`
    - Include file paths or specific details in bullet points

   **Common Section Headers:**
    - "New Features Added:" or "Features (n):"
    - "Bug Fixes:" or "Fixes (n):"
    - "Infrastructure Changes:" or "Infrastructure:"
    - "Dependencies:" or "Dependency Updates:"
    - "Documentation Updates:" or "Documentation:"
    - "Performance Improvements:"
    - "Tests:" or "Testing:"
    - "Refactoring:"

   **Formatting Guidelines:**
    - Each bullet point should be specific and actionable
    - Include file paths when relevant (e.g., `- Add login route in src/app/auth/page.tsx`)
    - Keep bullet points concise but informative
    - Add blank lines between sections for readability
    - Optionally add a summary statement at the end
    - Use session context to determine appropriate sections

   **Example Format:**
   ```
   feat: add user authentication system

   New Features (3):
   - Add JWT-based authentication middleware
   - Create login/signup pages with form validation
   - Implement protected route wrapper component

   Infrastructure:
   - Add bcrypt dependency for password hashing
   - Configure environment variables for JWT secret
   - Set up authentication database schema

   Tests:
   - Add unit tests for auth middleware
   - Add integration tests for login/signup flows

   Successfully authenticates users and protects sensitive routes.
   ```

   **Another Example:**
   ```
   fix: resolve payment processing race condition (#456)

   Bug Fixes:
   - Fix race condition in payment processor when handling concurrent requests
   - Add transaction locking in payment.ts
   - Update error handling in checkout flow

   Tests:
   - Add concurrency tests for payment processing
   - Verify transaction integrity under load
   ```
7. If single commit:
    - Stage all relevant changes with `git add`
    - Create the commit with the generated message
    - Show the result with `git status`
8. If multiple commits:
    - For each logical group of changes:
        * Stage only the relevant files with `git add <specific-files>`
        * Create the commit with its specific message
        * Show progress after each commit
    - Final `git status` to confirm all changes are committed

Changes in the .claude folder is related to `maint`

Do NOT push to remote unless explicitly requested.
Do NOT add any AI attribution, co-author tags, or generated-by footers to the commit message.