/*
 * Q-Free's mark, inlined rather than loaded as an image, because it is the one
 * two-tone logo in the set: a solid red body with five white counters layered on
 * top of it. The greyscale filter the other marks use washes the body to pale
 * grey and leaves the knockouts white, so the mark loses its counters and reads
 * as a rendering bug. Binding both tones to theme colours instead lets the
 * counters follow the page in either theme.
 *
 * Ported from askhb.no's src/components/QFreeMark.tsx. The path data is
 * transferred verbatim from there, and the translate() wrapper is load-bearing:
 * the paths live in a translated coordinate space and render off-canvas without
 * it. Two things had to change, and neither is cosmetic:
 *
 *   - The colours. askhb.no paints from --color-ink and --color-paper. Here the
 *     shared palette reaches CSS through quartz.config.ts, which maps the same
 *     two tokens to Quartz's --dark and --light. Same colours, different names.
 *
 *   - The per-theme opacity. On askhb.no it rides a Tailwind dark: variant, which
 *     keys off a class on <html>. This site has no Tailwind and switches theme
 *     with a saved-theme attribute, so the weight moves out of the markup and
 *     into the stylesheet, under .qfree-mark in ArticleTitleWithMark's css.
 *
 * WEIGHT, and why it is opacity on the group rather than a lighter fill on the
 * body. The counters are painted the page colour, so compositing the group over
 * the page leaves them at exactly the page colour whatever the alpha: counter
 * against body therefore stays equal to body against page by construction, and
 * retuning the weight can never quietly flatten the letterforms this component
 * exists to preserve. A lighter fill on the body alone would need re-checking
 * against the counters every time it moved.
 */

interface QFreeMarkProps {
  // Empty (the default) marks the SVG decorative, matching how the raster marks
  // are treated: the company name is already the page's title beside it.
  label?: string
}

const QFreeMark = ({ label = "" }: QFreeMarkProps) => (
  <svg
    viewBox="0 0 69.241249 85.03875"
    class="qfree-mark"
    focusable="false"
    {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
  >
    <g transform="translate(-328.23652,-475.55709)">
      {/* Body. */}
      <path
        fill="var(--dark)"
        d="M 397.47777,559.03334 C 397.47777,559.89584 396.77902,560.59584 395.91527,560.59584 L 329.79902,560.59584 C 328.93652,560.59584 328.23652,559.89584 328.23652,559.03334 L 328.23652,477.11959 C 328.23652,476.25584 328.93652,475.55709 329.79902,475.55709 L 395.91527,475.55709 C 396.77902,475.55709 397.47777,476.25584 397.47777,477.11959 L 397.47777,559.03334"
      />
      {/* Five counters, knocked out to the page colour so they invert with it. */}
      <path
        fill="var(--light)"
        d="M 374.85027,520.21959 C 374.45777,519.80834 368.10402,513.15959 368.10402,513.15959 L 361.50402,513.15959 C 361.50402,513.15959 370.89027,522.60084 371.35152,523.06459 C 369.04152,524.72209 365.77902,525.79709 362.90902,525.79709 C 354.05027,525.79709 346.84402,518.52084 346.84402,509.57584 C 346.84402,500.63084 354.05027,493.35459 362.90902,493.35459 C 371.76777,493.35459 378.97527,500.63084 378.97527,509.57584 C 378.97527,513.72334 377.61777,517.20584 374.85027,520.21959 z M 378.30152,523.78709 C 382.10402,519.63334 383.96402,515.03584 383.96402,509.73459 C 383.96402,498.12459 374.51902,488.67709 362.90902,488.67709 C 351.29902,488.67709 341.85277,498.07584 341.85277,509.62959 C 341.85277,521.12084 351.29902,530.47209 362.90902,530.47209 C 367.09902,530.47209 371.65152,529.00709 374.87277,526.64709 C 375.16402,526.96209 378.12152,530.15834 378.12152,530.15834 L 384.56152,530.15834 C 384.56152,530.15834 378.63652,524.12709 378.30152,523.78709"
      />
      <path
        fill="var(--light)"
        d="M 342.97402,546.82584 L 342.97402,535.54459 L 350.60152,535.54459 L 350.60152,536.87959 L 344.46777,536.87959 L 344.46777,540.35834 L 349.77402,540.35834 L 349.77402,541.69459 L 344.46777,541.69459 L 344.46777,546.82584 L 342.97402,546.82584"
      />
      <path
        fill="var(--light)"
        d="M 354.05027,540.51709 L 357.25652,540.51709 C 357.93902,540.51709 358.47152,540.44709 358.85402,540.30584 C 359.23777,540.16584 359.52777,539.93959 359.72777,539.62959 C 359.92652,539.32084 360.02527,538.98334 360.02527,538.61959 C 360.02527,538.08709 359.83277,537.64959 359.44652,537.30709 C 359.06027,536.96334 358.45152,536.79209 357.61902,536.79209 L 354.05027,536.79209 L 354.05027,540.51709 z M 352.55652,546.82584 L 352.55652,535.54459 L 357.55777,535.54459 C 358.56277,535.54459 359.32652,535.64584 359.84902,535.84834 C 360.37152,536.05084 360.79027,536.40834 361.10277,536.92209 C 361.41527,537.43459 361.57152,538.00209 361.57152,538.62334 C 361.57152,539.42334 361.31277,540.09834 360.79527,540.64709 C 360.27777,541.19709 359.47777,541.54584 358.39527,541.69459 C 358.79027,541.88459 359.09027,542.07209 359.29527,542.25584 C 359.73027,542.65709 360.14277,543.15709 360.53027,543.75709 L 362.48027,546.82584 L 360.61777,546.82584 L 359.12652,544.47959 C 358.69027,543.80334 358.33152,543.28459 358.04902,542.92584 C 357.76777,542.56709 357.51527,542.31584 357.29277,542.17209 C 357.06902,542.02834 356.84152,541.92834 356.61152,541.87209 C 356.44152,541.83584 356.16527,541.81709 355.78027,541.81709 L 354.05027,541.81709 L 354.05027,546.82584 L 352.55652,546.82584"
      />
      <path
        fill="var(--light)"
        d="M 363.96277,546.82584 L 363.96277,535.54459 L 372.09902,535.54459 L 372.09902,536.87959 L 365.45652,536.87959 L 365.45652,540.32459 L 371.67777,540.32459 L 371.67777,541.65959 L 365.45652,541.65959 L 365.45652,545.49084 L 372.36277,545.49084 L 372.36277,546.82584 L 363.96277,546.82584"
      />
      <path
        fill="var(--light)"
        d="M 374.46527,546.82584 L 374.46527,535.54459 L 382.60152,535.54459 L 382.60152,536.87959 L 375.95902,536.87959 L 375.95902,540.32459 L 382.17902,540.32459 L 382.17902,541.65959 L 375.95902,541.65959 L 375.95902,545.49084 L 382.86527,545.49084 L 382.86527,546.82584 L 374.46527,546.82584"
      />
    </g>
  </svg>
)

export default QFreeMark
