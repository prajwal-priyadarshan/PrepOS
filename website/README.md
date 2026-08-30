# PrepOS website

A plain static site — no build step, no framework. Just `index.html`, `styles.css`
and `script.js`, styled with the same colour tokens as the app itself
(`src/styles/tokens.css`), so it stays in sync by eye rather than by import.

## Adding the screenshots

Drop your two screenshots into `assets/` with these exact names:

- `assets/screenshot-dashboard.png` — the dashboard (today's time, the heatmap, prep plans)
- `assets/screenshot-workspace.png` — a prep's workspace (vault tree, reader, notes)

Any resolution works; the page scales them to fit. PNG or JPG both work — just
keep the filenames above, or update the `src` attributes in `index.html` if
you'd rather name them something else.

## Previewing locally

No build tooling needed — open `index.html` directly in a browser, or serve
the folder so relative paths behave exactly as they will once deployed:

```
npx serve website
```

## Deploying

Any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages). For
GitHub Pages from this repo: Settings → Pages → deploy from a branch → set the
folder to `/website`.

## Updating the download link

The "Download for Windows" button and the footer's Releases link both point at:

```
https://github.com/prajwal-priyadarshan/PrepOS/releases/latest
```

That always resolves to whatever the newest GitHub Release is — nothing here
needs to change when you cut a new version, as long as the installer is
attached to the release.
