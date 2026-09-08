# Process Model

Three kinds of file run in three different places, and the lint config is layered to match.

- **Main process**: every `src/*.js` except `src/beacons.js`, plus `scripts/*.js`. ES modules with Node globals, full access to `electron` and the system.
- **Preload**: `src/*-preload.cjs`. CommonJS with Node globals, bridging the main process to a window over `contextBridge`.
- **Renderer**: `src/*.html` and `src/beacons.js`, which `src/popup.html` pulls in with a plain `<script src>` tag. Browser globals only. There is no bundler, so a renderer file cannot `import` and cannot reach Node.

`eslint.config.js` gives each of those a block, and `eslint.config.test.js` resolves the real config per path and asserts the split holds. Run it before trusting a config change.

- Flat config **merges** `languageOptions.globals` across every matching block rather than replacing them. A browser block listed after the `**/*.js` block does not undo the Node globals that block already granted, so `src/beacons.js` is excluded from the Node block with `ignores` instead. Without that, `process` and `require` stay defined in a renderer file that cannot use them, and the typo only surfaces at runtime.
- Adding another renderer script means adding it to that `ignores` list and to the browser block, then extending `eslint.config.test.js` to cover it.

# Diagnostics

Use `log` from `src/log.js`. `no-console` is an error everywhere, including inline `<script>` blocks in the HTML, because a packaged app has no console attached and anything written there is lost.

- `log` appends to `~/Library/Logs/TimerBar.log` and rotates to `.log.1` past a megabyte. It is the only way to see what a running build did.
- Reading the log is how a change gets proved in a real build, since the app has no visible surface beyond the menu bar.

# Failure Handling

System readings degrade to `null` or an empty string and get logged. They do not throw.

- `run` in `src/shell.js` resolves to `''` when the command fails or exceeds its 5 second timeout, so callers branch on empty rather than catching.
- Optional system state (wifi SSID, power draw, presence) is absent often enough that absence is a normal value, not an error. A menu bar app that crashes because `ioreg` was slow is worse than one that shows nothing for a tick.
- This is deliberately the opposite of a server-side "fail loudly" rule. It applies to system readings, not to programming errors, which should still surface.

# Dates

`Date` is used directly, and there is no `Temporal` polyfill here. The 35 or so usages are ISO timestamps for the log and elapsed-time arithmetic, neither of which needs zone-aware types, so the dependency is not worth its bytes in a menu bar app.

# CI and Hooks

`.github/workflows/ci.yml` runs lint, format, knip, `pnpm audit`, CodeQL and gitleaks, then test and build, then release from `main` only. `.github/actions/install` is the shared setup step.

- Every action is pinned to a full commit SHA with its tag in a trailing comment. Bump by resolving the new tag to its SHA, never by moving the ref back to a floating tag.
- `scripts/assert-node-version.js` fails a job whose Node major does not match `engines.node`. It runs in CI only. Local machines routinely sit on a newer Node, and blocking every commit over that helps nobody.
- The build is not in the pre-commit hook. `electron-builder` takes minutes, which is too slow for a gate that runs on every commit, so a packaging break is caught by the `build` job instead.
- The `release` job publishes the DMG to the `latest` release and then `scripts/verify-release.sh` downloads it back, compares checksums and checks the signing identity. Merging to `main` therefore ships a public release.
- Artifact sizes are reported into the job summary by `scripts/report-sizes.sh` and never gate anything. A build growing is a fact to read, not a verdict.

`.husky/pre-commit` runs `lint-staged` (prettier then eslint with `--fix`), then knip, then the tests.

- **In a fresh worktree, run `pnpm install` before committing.** The hooks live in the generated `.husky/_` directory, so until the first install git silently skips every check and nothing warns you.
- The hook sets `set -e` itself rather than relying on husky invoking it with `sh -e`. Without it, only the last command's failure would block a commit, and a lint or knip failure would sail through.

# Style

No code comments. Names, structure and tests carry the meaning. See the global `~/.claude/CLAUDE.md` for the rest.
