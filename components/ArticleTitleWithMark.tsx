import {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "../quartz/components/types"
import { classNames } from "../quartz/util/lang"
import QFreeMark from "./QFreeMark"

/*
 * The page title, with its employer's mark beside it.
 *
 * This replaces Component.ArticleTitle in the content layout rather than
 * decorating it, and it lives outside quartz/ on purpose. The repo keeps a list
 * of local patches to the vendored tree precisely because an upstream merge
 * silently reverts them; a file upstream has never heard of cannot be reverted,
 * so this change adds nothing to that list. ArticleTitle stays where it is,
 * untouched, and is still what the list layout renders.
 *
 * Composing Component.Flex around the real ArticleTitle was the obvious
 * alternative and does not work. Flex wraps each child in its own div and
 * defaults align-self to center, while .article-title carries a 2rem top margin.
 * A flex item establishes a block formatting context, so that margin does not
 * collapse out: it makes the title's wrapper 2rem taller than the text inside it.
 * That wrapper is then the taller item, so it sets the line height and does not
 * move, while the shorter mark is centred against the whole line and lands half
 * that margin -- 16px -- above the text's own centre. Correcting it means
 * overriding vendored CSS whose emission order is decided by the order of
 * components in the layout, which is a fragile thing to depend on.
 *
 * The few lines of ArticleTitle duplicated here are stable ones: read the
 * frontmatter title, render an h1.article-title, render nothing without one.
 */

type MarkComponent = (props: { label?: string }) => preact.JSX.Element

/*
 * Marks that ship as components rather than images, keyed by the file name they
 * are stored under. Mirrors the registry in askhb.no's LogoMark, including its
 * reason for being an exact-match table: dispatching on something looser, like a
 * substring test or "any .svg", would render *any* future SVG logo as Q-Free's
 * mark, which is a silently wrong company on the page. An unrecognised file falls
 * through to the image branch.
 *
 * Note the cost this shares with its counterpart, since it is a real one: dispatch
 * is on the file name and nothing else, so a future logo whose name reduces to one
 * of these keys renders that company's mark. Names differing only in punctuation
 * are the same key here by design.
 */
const MARK_ALIASES: Record<string, MarkComponent> = {
  "logo-qfree": QFreeMark,
  "q-free": QFreeMark,
  "q-free_logo": QFreeMark,
}

/*
 * Strips everything that is not a letter or digit, and lowercases. The uploader
 * sanitises file names by replacing every run of non-alphanumeric characters with
 * a hyphen, so the same mark arrives spelled differently depending on when it was
 * uploaded: Q-Free_logo.svg is stored as q-free-logo.svg. Removing the separators
 * rather than enumerating their spellings keeps the table an exact match on a
 * known set.
 */
const normalise = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, "")

const MARKS: Record<string, MarkComponent> = Object.fromEntries(
  Object.entries(MARK_ALIASES).map(([alias, Mark]) => [normalise(alias), Mark]),
)

/** Last path segment of a url, without query, fragment or extension, normalised. */
const markKey = (url: string): string =>
  normalise(
    url
      .split(/[?#]/)[0]
      .split("/")
      .pop()
      ?.replace(/\.[^./]+$/, "") ?? "",
  )

const ArticleTitleWithMark: QuartzComponent = ({
  fileData,
  displayClass,
}: QuartzComponentProps) => {
  const title = fileData.frontmatter?.title
  if (!title) return null

  const mark = fileData.organisationMark

  /*
   * hasOwn, not a bare index: markKey comes from a remote url, and MARKS is an
   * ordinary object, so a logo stored as constructor.png would otherwise reach
   * Object.prototype and return something truthy that is not a component.
   * Normalising does not remove the hazard -- it strips the underscores out of
   * __proto__, but `constructor` survives it spelled exactly as the inherited key
   * -- and it is the only one that does, since lowercasing turns toString into
   * tostring and valueOf into valueof, which inherit from nothing. One key is
   * enough: a bare lookup on it returns Object itself, a function, which preact
   * would call as a component.
   */
  const key = mark ? markKey(mark.logoUrl) : ""
  const Mark = Object.hasOwn(MARKS, key) ? MARKS[key] : undefined

  return (
    <div class={classNames(displayClass, "article-title-row")}>
      {/*
       * Nothing at all rather than a reserved box when a page has no employer:
       * most notes do not, and an always-present slot would indent every title
       * past blank space.
       *
       * The mark is decorative and carries no label -- the company name is the
       * h1 directly beside it, and naming it here would be the second reading of
       * one string.
       *
       * Note where else this ends up: the page header is a .popover-hint, and
       * popover.inline.ts clones that subtree into the hover preview, so the mark
       * appears there too and fetches its image on hover. That reads correctly
       * and costs one small request, so it is left alone rather than excluded --
       * but it is why the mark shows up somewhere nobody put it.
       */}
      {mark && (
        <span class="organisation-mark">
          {/* Optical correction: equal boxes do not give equal visual weight. */}
          <span style={`transform: scale(${mark.logoScale ?? 1})`}>
            {Mark ? <Mark /> : <img src={mark.logoUrl} alt="" />}
          </span>
        </span>
      )}
      <h1 class="article-title">{title}</h1>
    </div>
  )
}

/*
 * The row owns the top margin that .article-title used to carry, and zeroes it on
 * the heading through a descendant selector rather than a bare .article-title
 * rule. That is deliberate: the list layout still renders the real ArticleTitle,
 * so its css ships too, and two single-class rules for one selector would be
 * decided by which component the layout mentions first. A descendant selector
 * outranks it on specificity, so the order stops mattering.
 *
 * The filter values are askhb.no's, measured per tonal band and per theme so that
 * a mark sits below the text beside it without washing out. What does not carry
 * across is the selector they hang on: askhb.no switches theme with a class on
 * <html> and writes this as a Tailwind dark: variant, while this site sets a
 * saved-theme attribute. A class-based rule copied from there produces a filter
 * that never switches, and it fails in the direction that looks correct in light
 * mode and wrong only once a reader touches the toggle.
 */
ArticleTitleWithMark.css = `
.article-title-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin: 2rem 0 0 0;
}

.article-title-row > .article-title {
  margin: 0;
}

.organisation-mark {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
}

.organisation-mark > span {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.organisation-mark img,
.organisation-mark svg {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.organisation-mark img {
  filter: grayscale(1) brightness(0.7) opacity(0.75);
}

[saved-theme="dark"] .organisation-mark img {
  filter: grayscale(1) brightness(0.75) invert(1) opacity(0.7);
}

/*
 * A component mark paints from the theme colours and knows its own ink coverage,
 * so it sets its own weight and takes none of the raster filter above. Two alphas
 * because the arithmetic is not symmetric: lifting a near-black page toward ink
 * gains contrast much faster than darkening warm paper does, so no single value
 * serves both themes.
 */
.qfree-mark {
  opacity: 0.73;
}

[saved-theme="dark"] .qfree-mark {
  opacity: 0.64;
}
`

export default (() => ArticleTitleWithMark) satisfies QuartzComponentConstructor
