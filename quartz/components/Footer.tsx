import { QuartzComponent, QuartzComponentConstructor } from "./types"

export default (() => {
  const Footer: QuartzComponent = () => {
    return (
      <footer>
      </footer>
    )
  }

  return Footer
}) satisfies QuartzComponentConstructor
