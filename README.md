# Peter Vale — Personal Site

An Astro site based on the **Personal Site — Visual Demo** on Page 1 in Paper. The portrait and signature are exported from that design. The interactive AFC II necklace comes from the supplied `necklace-animation` folder.

This repository is public and currently has no license. Reusing the code or visual assets requires permission.

## Edit the site

- The home page is in `src/pages/index.astro`.
- Add projects as Markdown files in `src/content/projects/`.
- Add essays or other texts in `src/content/texts/`.
- Add blog posts in `src/content/blog/`. Blog posts appear in the **Texts** column, ordered alongside other texts by date.
- Each file needs `title`, `description`, and `date` in its frontmatter. Set `draft: true` to keep an item off the published site. The example files in `texts/` and `blog/` are drafts you can copy.
- A project's optional `externalUrl` links its home-page row to another site instead of its local article page.

## Work locally

Use Node.js 22.12 or newer. Run `pnpm install`, then `pnpm dev`. Run `pnpm build` before publishing.

## Publish when ready

The repository includes `.github/workflows/deploy.yml`, which builds and deploys the site to GitHub Pages when run manually. In GitHub repository settings, choose **Pages → Build and deployment → GitHub Actions** as the source. The site is configured for `https://petervale.dev/`.

The custom domain is set to `petervale.dev` in GitHub Pages. Namecheap has four A records for `@` pointing to GitHub Pages (`185.199.108.153` through `185.199.111.153`) and a CNAME for `www` pointing to `petervale-dev.github.io`. GitHub redirects `www.petervale.dev` to the primary domain. The GitHub Actions deployment does not use a `public/CNAME` file.
