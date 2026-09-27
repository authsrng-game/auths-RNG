# contributing to auth's RNG

Thank you for your interest in contributing to **auth's RNG**! Please follow these guidelines to ensure smooth collaboration!

## How to contribute

Contributing to auth's RNG is pretty simple! Whether you're fixing a bug, improving the UI, balancing the game, or adding a small feature, contributions are welcome.

### 1. Fork the repository

Click the **Fork** button in the top-right of the GitHub repository page to create your own copy of auth's RNG.

### 2. Clone your fork

Clone your fork to your local machine:

```bash
git clone https://github.com/your-username/auths-RNG.git
```

Then enter the repository folder:

```bash
cd auths-RNG
```

### 3. Install dependencies

Install project dependencies with pnpm (optional):

```bash
pnpm install
```

### 4. Create a branch

Create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
```

Use a name that describes what you're working on. For example:

```bash
git checkout -b fix-mobile-ui
```

### 5. Make your changes

Work on your feature, fix, improvement, or whatever you're contributing.

Try to keep your changes focused. A small, well-explained change is much easier to review than a huge one that changes everything at once.

### 6. Commit your changes

Write a clear commit message that explains what you changed:

```bash
git commit -m "Fix incorrect aura display"
```

Avoid vague commit messages like:

```bash
git commit -m "stuff"
```

Nobody knows what "stuff" means. Not even future you.

### 7. Push your branch

Push your changes to your fork:

```bash
git push origin feature/your-feature-name
```

### 8. Open a pull request

Open a pull request from your fork's branch into the main repository.

In your PR description, explain:

- what you changed
- why you changed it
- any testing you did
- anything reviewers should know

---

## Pull request guidelines

Before submitting a PR, please keep these in mind:

- **Explain your changes clearly.** Give context about what changed and why.
- **Test and lint your changes.** Run `pnpm exec eslint .` and `pnpm exec stylelint "**/*.css"` to check for lint errors. To run tests, ensure Playwright Chromium is installed (`npx playwright install chromium --with-deps`), serve the repo locally on port 8080 (`python3 -m http.server 8080`), and run all Playwright test suites with `npx playwright test --project=chromium` (or target individual suites like `npx playwright test tests/smoke.spec.js --project=chromium`). You can also just play the game normally.
- **Keep commits focused.** Avoid mixing unrelated changes together.
- **Follow the existing code style.** Match the project's formatting, naming conventions, and structure.
- **Avoid changing unrelated files.** Only modify files needed for your change.
- **Keep things simple.** The best solutions are usually the ones that are easiest to understand and maintain.

> [!WARNING]
> **Never modify `.github/workflows` files or folders.**
>
> Please. Seriously.
>
> Even if you think it's a harmless package update or small fix, workflow changes can break the development pipeline. These files are maintained separately and PRs modifying them will most likely be rejected.

## Issues

If you find a bug or have a feature request, feel free to open an issue! Please be clear about the problem you're encountering or the feature you'd like to see added.

## Code Of Conduct

See CODE_OF_CONDUCT.md.

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project. See the LICENSE file for more details.

## For using AI

See AGENTS.md.

## How to style (frontend)

See meta/STYLES.md.

## Anonymous contributions

The official bulletin board (https://authsrng.bbs.fc2.com/) is also good if you want to make a PR without being labeled as a contributor, and/or if you just want to contribute anonymously. Make the first sentence be your commit message (be sure to add "Commit" at the start of it) and write a description of why you made this change, then use `git diff` and after you've reached the end of the git log by holding down `Enter` or what keybind you use to scroll down Git logs, copy and paste the entire output and put it 2 lines under your commit message. CAPITALIZATION AND CORRECT GRAMMAR IS NEEDED!

Example:

```txt
Commit: Replace unused script tag

Script "example.js" was removed before, and the script
tag made errors of the file not existing. Remove excess
line.

diff --git a/index.html b/index.html
index 1234567..89abcde 100644
--- a/index.html
+++ b/index.html
@@ -284,7 +284,6 @@
     <script src="assets/scripts/vendor.js" defer></script>
     <script src="assets/scripts/utils.js" defer></script>
-    <script src="assets/scripts/example.js" defer></script>
     <script src="assets/scripts/main.js" defer></script>
     </body>
 </html>
```

---

For more information, see the meta/ folder.
