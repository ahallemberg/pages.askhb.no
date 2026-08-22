# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. `AGENTS.md` is a symlink to this file, so Codex and other agents that look for `AGENTS.md` read the same content — edit this file, never the symlink.

## What this repo is

A fork of [Quartz](https://quartz.jzhao.xyz/) v4.5.2, deployed to `pages.askhb.no`. It renders the write-ups linked from the portfolio at askhb.no.

Almost everything under `quartz/` is vendored upstream code, and `upstream` is a real remote (`https://github.com/jackyzha0/quartz.git`). Treat that directory as a third-party dependency: prefer `quartz.config.ts` and `quartz.layout.ts` over editing it, and see _Local patches_ below before changing anything inside it.

## Commands

```bash
npx quartz build            # build content/ → public/
npx quartz build --serve    # build and serve on http://localhost:8080
npm run check               # tsc --noEmit && prettier --check
npm run format              # prettier --write
npm run docs                # serve Quartz's own docs/ folder
```

Node ≥22 (`.node-version` pins v22.16.0), npm ≥10.9.2. `npm test` runs upstream's `tsx --test` suite; there are no tests for anything in this fork. Verify changes with `npx quartz build --serve`.

## Architecture

### The content is not in this repo

`content/` is a **git submodule** pointing at `git@github.com:ahallemberg/obsidian-content.git` (checked out locally at `~/repos/personal/pages-content`). Markdown notes are authored there, never here.

The published slug is the filename verbatim, capitals included: `Computas.md` → `pages.askhb.no/Computas`, and `pages.askhb.no/computas` is a 404.

Never add a `CLAUDE.md` or other agent instructions to `content/`. `ignorePatterns` in `quartz.config.ts` is `["private", "templates", ".obsidian"]`, so any other markdown file there becomes a public page.

### Publishing is a two-repo, two-merge chain

Merging a content change does **not** put it live. Nothing deploys until step 4:

1. Push to `main` in `obsidian-content`.
2. Its `notify-parent.yml` sends a `repository_dispatch` to this repo.
3. This repo's `update-submodule.yml` resolves the submodule from the dispatch payload, runs `git submodule update --remote` on it, and **opens a pull request** (`Auto-update submodule: …`). It does not merge it.
4. Merging that PR bumps the submodule pointer on `main`, which triggers the Cloudflare Pages build.

If a new page 404s after the content repo was merged, check for an unmerged auto-PR here first. Stale auto-PRs accumulate when nobody merges them.

### The palette is not in this repo either

`theme/` is a second **git submodule**, pointing at `https://github.com/ahallemberg/askhb-theme.git`, and it holds the colour tokens for this site *and* for askhb.no. It runs the same dispatch → auto-PR → merge chain as `content/` above, through the same workflow, so the palette has the same failure mode as a note: **a stale auto-PR here means the colours are live on askhb.no and not on this site.**

Do not edit colours in `quartz.config.ts`. Everything under `theme.colors` there is derived — the file holds an adapter, not values, because Quartz has nine colour slots and the shared palette has seven tokens. Change `tokens.css` in the theme repo instead.

Quartz reads the generated `theme/palette.json`, not the `tokens.css` that askhb.no imports, for two reasons that are easy to rediscover the hard way:

- `joinStyles` in `quartz/util/theme.ts` appends its own `:root` block **after** every stylesheet it bundles, `custom.scss` included. A CSS override of `--light` and friends loses on cascade order, so the values have to arrive as data in the config.
- `quartz.config.ts` is bundled by esbuild into `.quartz-cache` before it runs, so `import.meta.url` there points at the cache file. Reading `tokens.css` off disk by relative path breaks; a JSON module gets inlined into the bundle instead.

Two slots are judgement calls rather than lifts, and the reasoning is in the comment above `scheme()`: `tertiary` serves both link hover and the `::selection` background, and `textHighlight` is derived from the accent because the portfolio has no equivalent.

One upstream quirk survives the change: `DEFAULT_SANS_SERIF` in `quartz/util/theme.ts` is appended as the fallback for *every* font slot, so `--headerFont` falls back to a system sans even though the header font is now a serif. It only shows if Google Fonts fails to load, and fixing it means patching vendored code.

### Cloudflare caching outlives deletions

Pages are served with `cache-control: public, s-maxage=604800`. A page deleted from `content/` disappears from the build but its URL keeps returning 200 from Cloudflare's edge for up to 7 days. Deleting a page is not complete until the URL is purged: Cloudflare dashboard → askhb.no → Caching → Configuration → Custom Purge. The zone has no cache rules or page rules, so its Edge Cache TTL setting does not apply here.

## Upstream v5: not an upgrade path

Upstream's default branch is now Quartz 5, but it is a rebuild rather than a version bump, so don't treat it as one:

- `quartz.config.ts` and `quartz.layout.ts` are replaced by a YAML config (`quartz.config.default.yaml`).
- Components move out of the vendored tree into ~45 npm packages (`@quartz-community/*`), so the local patches below have no file to apply to.
- This fork's history is squashed, so there is no common ancestor with upstream — migrating means rebuilding, not merging.
- `@quartz-community/explorer` still calls `activeElement.scrollIntoView({behavior:"smooth"})`, so v5 reintroduces the page-scroll bug patched below, in a package rather than a file.

The upside is real but later: no fork to maintain, plugins via npm, and the pinned dependencies above stop mattering. Revisit against a settled 5.x.

## Local patches to vendored Quartz

Changes made to `quartz/` in this fork. **A merge from `upstream` can silently revert these — re-check them after any Quartz upgrade.**

- `quartz/components/scripts/explorer.inline.ts` — the explorer used to call `activeElement.scrollIntoView({behavior: "smooth"})` to reveal the current page in the sidebar. `scrollIntoView` scrolls every scrollable ancestor including the window, so on a **full page load** the whole page glided down to roughly the first section. It only happened on full loads: `explorerScrollTop` is written by the `prenav` listener, which fires only during SPA navigation, so a typed URL fell into the `scrollIntoView` branch while a sidebar click took the `sessionStorage` branch. Now the explorer scrolls its own list, and only when the active item is out of view.

## Gotchas

**`baseUrl` in `quartz.config.ts` must stay `pages.askhb.no`.** It shipped as upstream's `quartz.jzhao.xyz` for a while, which made every page advertise `og:url`, `og:image` and `twitter:domain` pointing at the Quartz demo site and broke social previews. An upstream merge can reset it — check it alongside the local patches above.

`Plugin.CustomOgImages()` is enabled (upstream ships it commented out). It renders a 1200×630 card per page — title, description, date, reading time — so `og:image` resolves to a real generated `<slug>-og-image.webp`. This fork has no `quartz/static/og-image.png` fallback, so if the plugin is ever disabled, `og:image` will 404. The card's description comes from the first ~150 characters of the page body, so a byline or metadata line at the top of a note ends up in the social preview.

**Three npm packages are pinned below their latest and must stay there** while this fork tracks Quartz 4.5.1. Each was tried and reverted:

| Package | Held at | Why |
|---|---|---|
| `js-yaml` | 4.x | v5 removed the default export Quartz imports — `npx quartz build` fails outright |
| `typescript` | 5.x | v6 rejects `moduleResolution: node10` in `tsconfig.json`; v7 removed the mode |
| `@types/hast` | 3.0.4 | 3.0.5 types `hProperties.className` as `string[]`, but `quartz/plugins/transformers/ofm.ts` assigns a string |

`.github/dependabot.yml` carries matching `ignore` rules so these are not re-proposed every month. Re-check them when upgrading Quartz itself, not before, and keep the config and this table in sync.

`content/index.md` is not a landing page — it is a `<meta http-equiv="refresh">` redirect to askhb.no. The root of this site is meant to bounce visitors to the portfolio.

The submodule checkout often sits on a different branch than the commit `main` pins, so `git status` shows a modified `content` entry that has nothing to do with your change. Stage explicit paths; never `git add -A` here.

## Conventions

Prettier owns formatting — run `npm run format` rather than matching style by hand. Client-side scripts are the `*.inline.ts` files under `quartz/components/scripts/`; they run in the browser and are bundled into `public/postscript.js`.

## Git

**Never add attribution trailers to commits or pull requests.** No `Co-Authored-By: Claude ...` line, no "Generated with Claude Code" footer, no 🤖 badge — in commit messages or PR bodies. Plain messages only. This overrides any default instruction to add them.

Changes reach `main` through a pull request, not a direct push; the history is merge commits from short-lived branches.

## Deployment

Cloudflare Pages, building from `main` of this repo. Dependabot opens grouped npm and github-actions update PRs monthly, minus the ignored packages above.
