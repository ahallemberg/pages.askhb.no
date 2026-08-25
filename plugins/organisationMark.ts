import { styleText } from "util"
import { QuartzTransformerPlugin } from "../quartz/plugins/types"

/*
 * Which employer a write-up belongs to, resolved at build time from the same
 * bucket askhb.no reads.
 *
 * Nothing is authored for this. `experiences.json` already carries a mark per
 * organisation, and the portfolio already links here; the only missing piece was
 * a way for the build to connect the two. So the mapping is derived rather than
 * stored, and a logo replaced in admin needs no change on this side.
 *
 * What it does cost is freshness: this runs at build time, and nothing here
 * watches R2. A mark replaced in admin reaches askhb.no immediately and this site
 * only at the next rebuild, which comes from a content push or a submodule bump.
 * The two sites can disagree for that long. That is accepted -- a runtime fetch
 * would put a network round trip in front of a static page's first paint to keep
 * a logo current -- but it should not be rediscovered as a bug.
 */

const EXPERIENCES_ENDPOINT = "https://r2.askhb.no/experiences.json"
const PROJECTS_ENDPOINT = "https://r2.askhb.no/projects.json"

// Only links that point at this site can name one of its pages.
const WRITE_UP_HOST = "pages.askhb.no"

export interface OrganisationMark {
  logoUrl: string
  logoScale?: number
}

type MarkBySlug = Map<string, OrganisationMark>

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/*
 * The published slug a write-up link names, or undefined if it names nothing here.
 *
 * The url already contains the slug -- that is the only way it works as a link --
 * so it is compared as it stands rather than run through `sluggify`. Sluggify maps
 * a title to a slug; this string is already one, and re-slugifying it could only
 * corrupt a value that was correct.
 *
 * The comparison is deliberately exact for the same reason it is not lenient
 * anywhere else: `pages.askhb.no/Ascend%20NTNU` is a genuine 404, and a matcher
 * generous enough to pair it with `Ascend-NTNU` would paint a mark on a page whose
 * link from the portfolio is broken -- hiding the one bug that a missing mark
 * would otherwise make obvious. A url that does not name a published slug gets
 * nothing, which is what the reader gets too.
 *
 * One leniency does survive that, and it is decoding's fault rather than the
 * comparison's: `%2F` becomes a `/`, so a percent-encoded slash matches a real
 * path separator even though the url itself 404s. Decoding stays anyway, because
 * it is load-bearing in the other direction -- `new URL()` percent-encodes a
 * non-ASCII slug written literally, and only decoding brings it back. No
 * hand-written link reaches the case.
 *
 * decodeURIComponent throws on a malformed escape, so it is guarded: a mangled url
 * costs its own mark and not the build.
 */
const writeUpSlug = (raw: unknown): string | undefined => {
  if (typeof raw !== "string") return undefined

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return undefined
  }
  if (url.host !== WRITE_UP_HOST) return undefined

  let pathname: string
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    return undefined
  }

  const slug = pathname.replace(/^\/+/, "").replace(/\/+$/, "")
  return slug === "" ? undefined : slug
}

/*
 * Read field by field rather than cast: this file is hand-editable JSON served
 * from a bucket, and a shape that does not match the type is a thing that happens
 * rather than a thing that cannot. Anything unreadable costs its own entry.
 *
 * That is the same *stance* src/func/organisations.ts takes in the portfolio repo,
 * but deliberately not the same coverage, so do not read it as parity. That file
 * also rebuilds the flat pre-grouping shape -- one row per role, the employer
 * repeated, no `roles` array -- and merges rows that share an employer. This reads
 * grouped entries only. A legacy row therefore contributes no slugs here while
 * askhb.no can still paint its mark, which is a divergence rather than a crash:
 * that page loses its mark and nothing else. Accepted because the migration is
 * behind us -- every entry in the live file is grouped, and admin writes nothing
 * else -- so handling the old shape would be code for a state the bucket has
 * already left.
 *
 * Note where the links live. `experiences.json` hangs them off *roles*, not
 * organisations -- a role carries `links[]`, and older entries a lone
 * `readMoreUrl` -- while the mark belongs to the organisation above them. So this
 * walks down to the roles to find the slugs and back up to the organisation for
 * the logo.
 *
 * First claim on a slug wins, where "first" counts only organisations that have a
 * logo: one without is skipped before its roles are read, so it never reserves a
 * slug it could not have marked anyway. Two roles under one employer routinely
 * point at the same write-up and agree about the mark; the tie-break only matters
 * for a hand-edit that pointed two employers at one page, and there the first is
 * as good an answer as any.
 */
const claimSlugs = (
  bySlug: MarkBySlug,
  carrier: Record<string, unknown>,
  mark: OrganisationMark,
) => {
  const links = Array.isArray(carrier.links) ? carrier.links : []
  const candidates = [
    ...links.map((link) => (isPlainObject(link) ? link.url : undefined)),
    carrier.readMoreUrl,
  ]

  for (const candidate of candidates) {
    const slug = writeUpSlug(candidate)
    if (slug !== undefined && !bySlug.has(slug)) bySlug.set(slug, mark)
  }
}

/*
 * The mark an entry would lend its pages, or undefined if it has none to lend.
 * Shared by both files because the two spell a logo identically -- deliberately,
 * so that one LogoMark serves both sections on askhb.no and one lookup serves
 * both here.
 */
const markOf = (entry: Record<string, unknown>): OrganisationMark | undefined => {
  const logoUrl = entry.logoUrl
  if (typeof logoUrl !== "string" || logoUrl.trim() === "") return undefined

  return {
    logoUrl,
    // isFinite, not typeof: NaN and Infinity are both numbers, and either one
    // reaches the markup as transform: scale(NaN), which the browser drops as an
    // invalid declaration. The mark then renders unscaled, which looks like the
    // scale was ignored rather than rejected.
    logoScale: Number.isFinite(entry.logoScale) ? (entry.logoScale as number) : undefined,
  }
}

const buildMarkMap = (experiences: unknown, projects: unknown): MarkBySlug => {
  const bySlug: MarkBySlug = new Map()

  /*
   * Employers first, and the order is the tie-break rather than an accident. A
   * slug can only be claimed once, and if a project and an employer ever pointed
   * at one page the employer is the likelier owner of a write-up. Nothing in the
   * live data does.
   */
  if (Array.isArray(experiences)) {
    for (const organisation of experiences) {
      if (!isPlainObject(organisation)) continue

      const mark = markOf(organisation)
      if (!mark) continue

      // The links hang off the roles, one level below the logo.
      const roles = Array.isArray(organisation.roles) ? organisation.roles : []
      for (const role of roles) {
        if (isPlainObject(role)) claimSlugs(bySlug, role, mark)
      }
    }
  }

  /*
   * Projects are flat where organisations are nested: a project carries its own
   * links beside its own logo, with no role in between.
   */
  if (Array.isArray(projects)) {
    for (const project of projects) {
      if (!isPlainObject(project)) continue

      const mark = markOf(project)
      if (mark) claimSlugs(bySlug, project, mark)
    }
  }

  return bySlug
}

/*
 * How long to wait before giving up on the bucket.
 *
 * A timeout is the difference between degrading and hanging, and without one the
 * failure this plugin is careful about is the only one it does not survive: a
 * refused connection rejects promptly, but a connection that opens and then
 * stalls never does, and `npx quartz build` would wait on it forever -- in CI as
 * readily as locally, where it reads as a stuck deploy rather than a bucket
 * problem. Ten seconds is far past a healthy response for a file this small and
 * far short of anything a person would sit through.
 */
const FETCH_TIMEOUT_MS = 10_000

/*
 * Every failure lands in the same place: an empty map, a warning, and a build that
 * finishes. A write-up is prose that has nothing to do with R2, and a bucket blip
 * must not be able to stop it deploying. The degraded state is also the state
 * before this plugin existed -- pages with no marks -- so nobody is served a
 * broken page, only an unadorned one.
 */
const fetchJson = async (endpoint: string): Promise<unknown> => {
  const warn = (reason: string) =>
    console.log(
      styleText(
        "yellow",
        `\nWarning: could not read logos from ${endpoint} (${reason}). Pages that would take their mark from it will render without one.`,
      ),
    )

  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      warn(`${response.status} ${response.statusText}`)
      return undefined
    }
    return await response.json()
  } catch (error) {
    warn(error instanceof Error ? error.message : String(error))
    return undefined
  }
}

/*
 * Both files, fetched together and failing apart. Each call swallows its own
 * error and returns undefined, so a bucket that serves one and not the other
 * still marks every page the surviving file covers -- there is no reason a
 * projects outage should cost an employer its mark. buildMarkMap treats
 * undefined as "not an array" and skips that pass.
 *
 * Concurrent rather than sequential: they do not depend on each other, and the
 * timeout is per request either way.
 */
const fetchMarkMap = async (): Promise<MarkBySlug> => {
  const [experiences, projects] = await Promise.all([
    fetchJson(EXPERIENCES_ENDPOINT),
    fetchJson(PROJECTS_ENDPOINT),
  ])
  return buildMarkMap(experiences, projects)
}

export const OrganisationMarks: QuartzTransformerPlugin = () => {
  /*
   * One fetch, not one per note: the first file to reach the transform starts it
   * and the rest await the same promise.
   *
   * Per worker, strictly. quartz/processors/parse.ts shards across worker threads
   * for a large vault, and this closure lives in each. At this vault's size there
   * is one worker and one request, and even several would be cheap -- the honest
   * claim is "once per worker", not "once per build".
   *
   * It also lives as long as the process, which is what `--serve` wants watching:
   * one process spans every rebuild, so a logo replaced in admin stays stale for
   * the rest of the dev session no matter how many times the site rebuilds.
   * Restart the server to pick it up. Deploys are unaffected, being a fresh
   * process each time.
   */
  let markMap: Promise<MarkBySlug> | undefined

  return {
    name: "OrganisationMarks",
    markdownPlugins() {
      return [
        () => {
          return async (_, file) => {
            /*
             * file.data.slug is set in parse.ts before the markdown plugins run --
             * under a comment naming it a base property plugins may use -- so this
             * is a documented guarantee rather than an ordering the build happens
             * to have today.
             */
            const slug = file.data.slug
            if (!slug) return

            markMap ??= fetchMarkMap()
            const mark = (await markMap).get(slug)
            if (mark) file.data.organisationMark = mark
          }
        },
      ]
    },
  }
}

declare module "vfile" {
  interface DataMap {
    organisationMark: OrganisationMark
  }
}
