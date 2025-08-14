# Agent Instructions

This repository contains a small static web app written in plain JavaScript, HTML, and CSS.

## Code Style

- Use two spaces for indentation.
- Prefer double quotes for strings in JavaScript and HTML.
- End JavaScript statements with semicolons.
- Keep CSS properties in lowercase and use long-form hexadecimal colors when specifying colors.
- Format modified HTML, CSS, and JS files with Prettier before committing:
  - `npx prettier --write <files>`

## Testing / Checks

- There are currently no automated tests. If tests are added, expose them through `npm test` and run that command after making changes.
- After formatting, verify formatting with Prettier:
  - `npx prettier --check <files>`
- If assets or filenames referenced by the service worker or manifest change, keep those lists updated so the app functions offline.

## Miscellaneous

- The intro (`#intro-video`) and creature (`#creature`) videos in `index.html` must autoplay. Keep their `autoplay` attributes so they start automatically, and avoid changes that interfere with the automatic playback.
- This file's instructions apply to the entire repository.
- Leave the working tree clean before finishing.
