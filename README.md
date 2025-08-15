# Personal Quartz

## Repository Structure

- **This repo**: Quartz framework and configuration
- **Content repo**: `ahallemberg/obsidian-content` - Contains all markdown files
- **Content is pulled in as a git submodule**

## Local Development

```bash
# Start development server
npx quartz build --serve
```

## Deployment

- **Platform**: Cloudflare Pages
- **Build command**: `npm run build`
- **Output directory**: `public`
- **Auto-deploys** on push to main branch

## Configuration

### Theme Colors
- Minimal gray palette (no bright colors)
- Matches main portfolio aesthetic
- Light/dark mode support

### Custom Modifications
- Footer removed (edited `Footer.tsx`)
- Typography: Inter font family
- Max width: matches portfolio (72rem)

## Content Management

### Adding New Notes
1. Add markdown files to the content submodule repo
2. Use Obsidian for editing (supports wikilinks, backlinks)
3. Push to content repo
4. Update submodule in this repo
