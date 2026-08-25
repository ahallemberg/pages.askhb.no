# Company marks on write-up pages

**Date:** 2026-08-25
**Status:** approved, ready for an implementation plan
**Branch:** `feat/write-up-logos`
**Repo touched:** this one only
**Companion spec, already implemented:** the same marks on the askhb.no project
cards, at `askhb.no/docs/superpowers/specs/2026-08-25-project-card-logos-design.md`.
That spec settled the placement and the treatment; this one inherits both and
does not re-argue them.

Why this file is not under `docs/`: that directory is vendored Quartz
documentation, seventeen entries unchanged since the initial commit. Mixing fork
material into it invites the same merge pain the repo's own guidance warns about
for `quartz/`. A top-level `specs/` has no upstream counterpart, is not
`content/` so it is never published, and is not what `npm run docs` serves.

## Problem

An employer's mark identifies its entry on askhb.no. Follow the _Read more_ link
and the mark is gone: the write-up opens on a bare title, and nothing on the page
says whose internship it describes except the word at the top. The two sites are
meant to read as one thing, and the moment a reader crosses between them is
exactly where that breaks.

The marks already exist, in `experiences.json`, and the link already points here.
Nothing new has to be authored. What is missing is a way for the build to know
which organisation a note belongs to.

## Solution

A build-time transformer fetches `experiences.json`, matches each note's
published slug against the write-up links stored on the roles, and attaches the
organisation's `logoUrl` and `logoScale` to that page's `fileData`. A custom
component renders the mark to the left of the `h1`.

### Where the data comes from

A `QuartzTransformerPlugin` registered in `quartz.config.ts`, using
`markdownPlugins`. The slug is available by then and this is not an assumption:
`quartz/processors/parse.ts:105` assigns `file.data.slug` under a comment reading
"base data properties that plugins may use", and `processor.run` — which executes
the markdown plugins — runs three lines below it, with only `processor.parse`
in between.

The fetch happens once, not once per note. The plugin instance holds a memoised
promise created on first use, and each file awaits it. Note the caveat rather
than discovering it later: `parse.ts` shards across worker threads for a large
vault, and the memo — held on the plugin instance, which is constructed once per
process — is per worker. `parse.ts` clamps concurrency to files/128, capped at
four, so at three notes there is one worker and one fetch; the statement to hold
onto is "once per worker", not "once per build", and neither is expensive.

The new field is typed the way every transformer in this tree types its output,
by declaration merging:

```ts
declare module "vfile" {
  interface DataMap {
    organisationMark: { logoUrl: string; logoScale?: number }
  }
}
```

### Matching a note to an organisation

`experiences.json` hangs write-up links off **roles**, not organisations: a role
carries `links[]` and, on older entries, a lone `readMoreUrl`. So the map is
built by walking organisations, then their roles, then their links, keeping any
whose host is `pages.askhb.no`, and mapping the slug in that url to the
_organisation's_ `logoUrl` and `logoScale`.

The url already contains the published slug, because that is the only way it
could work as a link. So the rule is: take the path, drop leading and trailing
slashes, decode percent-encoding, and compare it to `file.data.slug` exactly.

**Do not run it through `sluggify` first**, and do not make the comparison
lenient. `sluggify` maps a title to a slug; this url is already a slug, and
re-slugifying it can only change a string that was right. Leniency is worse than
useless here: `pages.askhb.no/Ascend%20NTNU` is a real 404, as this repo's own
guidance spells out, and a matcher generous enough to pair it with
`Ascend-NTNU` would paint a mark on a page whose link from askhb.no is broken —
hiding the one bug the mark's absence would otherwise make obvious. A url that
does not resolve to a published slug gets no mark, which is exactly what the
reader gets.

**Both marked pages are marked on day one, and every page there is stays
correct.** The pinned `content/` submodule holds three files — `Computas.md`,
`Netlight.md` and the `index.md` redirect — and Computas and Netlight are exactly
the two organisations carrying a `readMoreUrl`, so both get their mark and the
redirect gets nothing.

Read that state carefully, because an earlier draft of this spec got it wrong.
The five other write-ups were deleted from the content repo on 2026-08-24 in
"Remove the five write-ups that were never written", so there is no Ascend note
and no Q-Free note at the pinned commit. What misled the draft is the trap this
repo's own guidance names: **a local `content/` checkout often sits on a
different branch than the commit `main` pins**, and the working copy in the main
clone still shows all eight files. Read the pinned tree, not the directory.

When a write-up is written and linked, it acquires its mark with no code change
here. Until then the absence is the matching rule working, not a gap in it — do
not add a name-based fallback to "fix" it. Matching a file called
`Ascend NTNU.md` to the organisation called `Ascend Aerial Robotics Team` would
require guessing, and guessing wrong puts one employer's mark on another's page.

### When the bucket is unreachable

The map comes back empty, no page gets a mark, and **the build succeeds**. The
fetch is wrapped so that a network failure, a non-200, or JSON that does not
parse all land in the same place: log a warning to the build output and carry on.

This is the one behaviour worth being firm about. A write-up is a page of prose
that has nothing to do with R2, and a bucket blip must not be able to stop it
deploying. The degraded state is also the current state — no marks — so nobody
is served a broken page, only an unadorned one.

**The fetch is also timed out, which this spec originally missed.** Handling
every error still leaves the failure that raises none: a refused connection
rejects promptly, but a connection that opens and then stalls never does, and the
build would wait on it forever — in CI as readily as locally, where it reads as a
stuck deploy rather than a bucket problem. Ten seconds bounds it, which is far
past a healthy response for a file this small and far short of anything a person
would sit through. Note it must bound the whole request rather than connection
setup alone, since a body can stall after the headers arrive.

### Rendering

One custom component that owns the whole row: it renders the mark and the `h1`
itself, and it lives **outside `quartz/`**, imported directly by
`quartz.layout.ts` in place of `Component.ArticleTitle()`. It carries its own
styles as a `css` string on the component, the way `ArticleTitle` does.

The mark's box is 2.75rem here against the companion spec's 2rem, and the
difference is deliberate rather than drift: there the mark sits beside an `h3` on
a 268px card, here beside the `h1` that opens a page. Keeping 2rem against a
heading that much larger reads as a stray favicon rather than an identifying
mark. The treatment this inherits from that spec is the ink filter and the
placement, not the pixel size, which was measured against its own heading in both
cases.

Living outside the vendored tree is the point. This repo keeps a list of local
patches to `quartz/` precisely because an upstream merge silently reverts them;
a new file upstream has never heard of cannot be reverted, and this change adds
nothing to that list. `ArticleTitle` stays where it is, untouched and merely
unused by the content layout.

Two alternatives were considered and both are worse:

**`Component.Flex` around the existing `ArticleTitle`.** Attractive because Flex
already exists and the layout already uses it. It fails on a detail that would
only show up in the browser: Flex wraps each child in its own div and defaults
`align-self` to center, while `.article-title` carries `margin: 2rem 0 0 0`. A
flex item establishes a block formatting context, so that top margin does not
collapse out — it makes the title's box 2rem taller at the top, and centering
that wrapper the taller item, so it sets the line height and does not move, while
the shorter mark is centred against the whole line and lands half that margin,
16px, above the text's own centre. Correcting that means overriding vendored CSS whose emission order
is decided by the order of components in the layout, which is a fragile thing to
depend on.

**Patching `ArticleTitle` in place.** Fewer lines than duplicating its six, and
exactly the kind of edit the local-patches list exists to warn about.

The duplication this costs is small and stable: read `frontmatter.title`, render
an `h1.article-title`, return null when there is no title.

### The ink treatment, which does not port by copying

The mark is rendered as ink, matching askhb.no. The filter values transfer
unchanged — they were measured per tonal band and per theme — but **the selector
they hang on does not**, and this is the single easiest thing to get wrong.

askhb.no's dark mode is a class on `<html>`, so its filter rides a Tailwind
`dark:` variant. This site has no Tailwind, and its dark mode is an _attribute_:
`quartz/components/scripts/darkmode.inline.ts` sets `saved-theme="dark"` on
`documentElement`. Copying the class-based rule across produces a filter that
never switches, and it fails in the direction that looks fine in light mode and
wrong only after a reader touches the toggle. The dark rule must be written
against `[saved-theme="dark"]`.

Also note the JSX dialect: components in this tree are preact and write `class=`,
not `className=`.

### Q-Free

Q-Free's mark is the two-tone SVG that a greyscale filter destroys — an opaque
red body with white counters painted over it. askhb.no solves this with a
hand-inlined `QFreeMark` component and an exact-match registry keyed on the
logo's file name. Both have to come across.

The port is a translation, not a copy, because the two sites name their colours
differently. `QFreeMark` binds the body to the ink token and the counters to the
paper token; on askhb.no those are `--color-ink` and `--color-paper`, while here
the palette reaches CSS through `quartz.config.ts`, which maps the shared
`ink` token to Quartz's `--dark` and `paper` to `--light`. The two per-theme
alpha values transfer as they are.

**Port it now, before the Q-Free note is linked.** Q-Free has no `readMoreUrl`
today, so nothing would render it, and it is tempting to defer. Don't: the day
someone sets that link in admin, a page appears with a mark that has lost its
counters, and nothing connects that to a decision made here. The registry is the
same shape as askhb.no's and carries the same documented hazard — dispatch is on
the file name, so any future logo whose name reduces to `qfree` renders Q-Free's
mark.

### One consequence to state plainly

The fetch is at build time, so **a logo replaced in admin reaches askhb.no
immediately and this site not at all** until something triggers a rebuild.
Nothing here watches R2; rebuilds come from content pushes and submodule bumps.
The two sites can therefore disagree about an employer's mark for as long as
that takes. This is accepted rather than solved — a runtime fetch would put a
network round trip in front of a static page's first paint to keep a logo fresh,
which is a bad trade — but it should not be rediscovered as a bug.

## Rejected

**Frontmatter on each note.** Simplest possible change, no build coupling. But
the logo urls carry a random path segment and a `?v=` cache-buster that changes
whenever a logo is re-uploaded, so a hand-copied url goes stale silently, and it
carves an exception into the content repo's no-frontmatter convention.

**Committing the logo files into this repo.** Self-contained, no R2 dependency
at build or runtime, and the SVG would be available to inline. Costs two copies
of every mark kept in sync by hand, and a logo replaced in admin never arrives.

**A runtime fetch in the browser.** Layout shift on every write-up, a request
that must survive CORS, and a mark that pops in after the text. See the build
time consequence above for what it would buy.

**Brand colour instead of ink.** Settled in the companion spec against all six
marks in both themes. It would also mean changing shipped, tuned work on
askhb.no rather than only adding here.

## Not in this spec

Setting `readMoreUrl` on the Ascend and Q-Free entries, which is content work in
admin and is what makes those pages acquire marks. Writing the Ascend and Q-Free
notes, which are placeholders today. Any change to `quartz/`, to the palette
submodule, or to askhb.no.

## Verification

`npm test` in this repo runs upstream's suite and covers none of this; there are
no tests for anything in the fork, and this spec does not invent any.

1. `npm run check` — `tsc --noEmit` plus prettier. Prettier owns formatting here,
   so run `npm run format` rather than matching style by hand. **This step cannot
   go green, and that is not this branch's doing:** `tsc` already reports three
   errors on `main`, all in `quartz/components/scripts/search.inline.ts`, from a
   flexsearch typings mismatch. The check that matters is therefore a comparison,
   not a pass — capture the error list on `main` and confirm this branch's is
   identical. Fixing the underlying three means editing vendored code and is not
   in scope here.
2. `npx quartz build --serve`, then read `/Computas` and `/Netlight` in both
   themes and confirm the mark sits beside the title in each.
3. Confirm a page with no matching link renders exactly as it does today, with
   the title flush left and no reserved space. At the pinned content commit the
   only such page is `/` — the `index.md` redirect — since the other two notes
   are both linked. Do not reach for `/FEYN` or `/Web-Development`: those notes
   were deleted on 2026-08-24 and no longer build.
4. Break the endpoint deliberately, by pointing the url at a host that does not
   resolve, and confirm the build still completes and every page renders without
   a mark. This is the failure path that matters most and the one least likely to
   be exercised by accident.
5. Force `saved-theme="dark"` and confirm the filter actually switches. A
   class-based rule copied from askhb.no passes steps 2 and 3 and fails only
   here.
6. Check Q-Free's mark keeps its counters in both themes, by temporarily
   pointing a note's match at the Q-Free entry — the registry cannot otherwise
   be exercised, since no note links to Q-Free and none exists at the pinned
   content commit.

None of steps 2 to 6 leaves a trace in the branch, so record the result here
rather than relying on it being reproducible. As implemented and checked: the
marks render on both pages in both themes; `/` renders unmarked with the heading
flush left; an unreachable endpoint warns and still emits every page; the filter
switches on the attribute, confirmed from computed style rather than by eye; and
the Q-Free component resolves to ink on paper in light and inverts cleanly in
dark, counters intact.
