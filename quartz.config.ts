import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"
import { OrganisationMarks } from "./plugins/organisationMark"
import palette from "./theme/palette.json"

/**
 * Quartz has nine colour slots; the shared palette in `theme/` has seven tokens.
 * This is the adapter between them, so a colour change made over in askhb-theme
 * reaches this site without an edit here. See `theme/README.md` for why Quartz
 * reads the generated JSON rather than the CSS the portfolio imports.
 *
 * Slot semantics are taken from how `quartz/styles/base.scss` actually uses
 * them, not from the names: `dark` is heading text, `darkgray` is body copy,
 * `light` is the page background.
 *
 * Two slots are not a straight lift:
 *
 *   tertiary       is both the link hover colour and, mixed at 60% over the
 *                  page, the ::selection background. The portfolio's own hover
 *                  is accent -> ink, but ink at 60% over paper leaves selected
 *                  text at roughly 2:1 against the band it sits on. ink-faint
 *                  holds ~3.9:1 there and still reads as a state change, so
 *                  legibility takes the slot. Splitting the two apart means
 *                  overriding ::selection in custom.scss.
 *   textHighlight  has no counterpart on the portfolio, which never marks text.
 *                  Derived from accent rather than invented, so it follows a
 *                  future accent change instead of drifting away from it.
 */
const MARK_ALPHA = "38" // 22%, near where upstream's amber highlighter sat

const scheme = (tokens: typeof palette.colors.light) => ({
  light: tokens.paper,
  lightgray: tokens.rule,
  gray: tokens["ink-faint"],
  darkgray: tokens["ink-muted"],
  dark: tokens.ink,
  secondary: tokens.accent,
  tertiary: tokens.ink,
  highlight: tokens["rule-faint"],
  textHighlight: tokens.accent + MARK_ALPHA,
})

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Ask Hallem-Berg",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "en-US",
    baseUrl: "pages.askhb.no",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        // 700 is in the set because base.scss reverts headings to the browser
        // default weight rather than naming one.
        header: { name: palette.fonts.serif, weights: [400, 600, 700] },
        body: palette.fonts.sans,
        code: palette.fonts.mono,
      },
      colors: {
        lightMode: scheme(palette.colors.light),
        darkMode: scheme(palette.colors.dark),
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
      // Not from ./quartz/plugins: this one belongs to the fork, so it lives
      // outside the vendored tree where an upstream merge cannot revert it.
      OrganisationMarks(),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
