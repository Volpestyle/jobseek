# Mermaid Diagram Workflow

Each Mermaid diagram stored in this folder is tied to a markdown file in `docs/` through `manifest.json`. The manifest maps a diagram ID to:

- the markdown file that embeds the generated image
- the Mermaid source file (`*.mmd`)
- the generated asset path (usually an SVG under `docs/mermaid/<DOC>/`)

## Adding a Diagram

1. Create a `.mmd` source file inside a folder named after the markdown document (for example `ARCHITECTURE/diagram-name.mmd`).
2. Add an entry to `manifest.json` with the markdown filename, source path, and desired output path relative to `docs/`.
3. Reference the generated image in the markdown file using the output path, and optionally leave a `<!-- Mermaid source: ... -->` comment for clarity.
4. Run `pnpm mermaid:generate` to render the SVG/PNG assets using the Mermaid CLI.

The render script checks that each source file exists and will error if a manifest entry is misconfigured.

## Configuration

- Update `docs/mermaid/config.json` to tweak shared Mermaid settings (for example disabling HTML labels for better SVG compatibility).
