# Necklace animation — site handoff

This folder is a self-contained, static website feature. Keep these five files together:

- `index.html` — interactive 3D necklace
- `ascii.html` — detailed gray-shaded ASCII version
- `scene.js` — shared necklace model, motion, and controls
- `styles.css` — layout and styling
- `README.md` — this handoff note

## Put it on the site

Copy the entire `necklace-animation` folder into the GitHub Pages publishing directory. Link to `necklace-animation/` for the 3D view or `necklace-animation/ascii.html` for the ASCII view. Both pages link to each other. Use paths relative to the site's page or repository base path, especially if the GitHub Pages site is hosted under a repository name.

To place the ASCII view inside an existing page, an iframe is an option:

```html
<iframe src="necklace-animation/ascii.html" title="Interactive ASCII necklace" style="width:100%;height:min(85vh,900px);border:0"></iframe>
```

The pages use relative file paths, so they work from any subfolder without a build step, package manager, API key, or remote asset. A browser with WebGL 2 is required for both views; the ASCII artwork is generated from the live 3D rendering.

Moving the cursor tilts the necklace. Dragging a link reshapes the closed chain, which slowly returns to its original loop after release. Dragging empty space turns the piece, scrolling zooms, and **Reset View** immediately restores the starting view. The 3D and ASCII pages share the same behavior. The chain is one irregular 128-link loop; the cross is modeled from the supplied front photographs.
