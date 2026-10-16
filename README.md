# summerschedule

A weekly class schedule planner. No installation or account is needed.

## Open the app

Double-click `index.html`, or run `npm start` from this folder and open `http://127.0.0.1:4173`.

Use the same browser and address each time: your schedule is saved automatically in that browser's local storage. Other browsers and addresses have separate schedules. Clearing browser data removes saved sections. If saving is blocked, the header will say so.

## Build your week

1. Enter a class code, a description, both, or neither. When both are entered, the class code appears above the description. With neither, the name remains blank.
2. Set start and end times, then check the days the section meets.
3. Select **Add section**. It appears in the checklist and on the calendar.
4. Check or uncheck sections to compare possible schedules. You may add any number of options for the same class. Overlapping sections appear side by side.
5. Use the pencil to edit, the copy button to prefill a new option, and the trash button to delete. Deleting offers an undo button.

The calendar automatically expands for early or late classes. It shows a recurring Monday–Sunday week, and meeting times must end later on the same day. On smaller screens, scroll the calendar sideways to see the whole week.

## Development

This is a dependency-free HTML, CSS, and JavaScript app. Google Fonts is optional; system fonts are used when offline.

- `npm start` — start the local server
- `npm run check` — check JavaScript syntax
- `npm test` — verify naming, time validation, storage normalization, positioning, and overlap layout
- `npm run build` — copy only the public app files into `dist/`

## Publish with GitHub Pages

This app is a static website: GitHub Pages can host it without running `server.js` or installing dependencies. A workflow in `.github/workflows/deploy.yml` checks the code, runs the tests, and publishes `dist/` whenever you push to `main`.

1. Create a public GitHub repository named `summerschedule`. Leave the README, license, and gitignore initialization options off if you will push this existing folder.
2. Upload or push the source files, including `.github/workflows/deploy.yml`, `scripts/`, and `tests/`. The local `preview.jpg`, browser schedules, and generated `dist/` are not part of the source upload.
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open **Actions → Deploy summerschedule → Run workflow**, choose `main`, and run it. Later pushes to `main` deploy automatically.
5. Once the workflow succeeds, **Settings → Pages** shows the live address, usually `https://YOUR-USERNAME.github.io/summerschedule/`.

The published artifact contains only `index.html`, `styles.css`, `app.js`, `schedule-core.js`, `logo.png`, and `.nojekyll`. It does not include the local server, tests, repository metadata, or screenshots. The source repository is public.

Schedules stay in browser storage. The published address has separate storage from a local file or localhost, so existing local classes will need to be entered again on the hosted site. There is no account, cloud synchronization, or shared schedule database.

GitHub's instructions: [Creating a Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), [publishing with Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
