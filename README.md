# branmora.github.io

The source of Brandon Mora's site, [https://branmora.github.io/](https://branmora.github.io/), in English and Spanish: selected LinkedIn posts and longer notes, each with its full text and, where it has one, its chart, data, method, and sources. GitHub Pages serves the site from this repository.

## What comes from where

Two kinds of change reach this repository, both as pull requests. Every pull request runs the check, the production build, which fails on a piece that breaks `CONTENT.md`. Only the author merges, and a merge into `main` runs the deploy, which publishes the site to GitHub Pages.

**Pieces** live in `content/`, the only copy of the site's writing. They arrive as pull requests from linkedin-content-manager, the author's repository for posts and figures, one pull request per piece. Each adds or changes one page bundle, in the format [`CONTENT.md`](CONTENT.md) defines, such as `content/posts/<folder>/` with `index.en.md`, `index.es.md`, and the files their front matter names. A correction to a piece is a pull request here too, by hand or from linkedin-content-manager.

**The theme** comes from releases: pull requests from the private repository that builds the site's design and templates, each naming the commit it came from and saying when `CONTENT.md` changed. These files come from releases and must not be edited here, as the next release replaces them:

- `hugo.toml`, the configuration
- `layouts/`, `assets/`, `i18n/`, `data/`, and `tokens/`
- `CONTENT.md`, the content format, which the build enforces
- `scripts/hugo.py`, `pyproject.toml`, `uv.lock`, `.hugo-version`, and `.python-version`, the build and its tools
- `.github/workflows/`, the check every pull request runs and the deploy every merge into `main` runs
- `LICENSE`, `LICENSE-CONTENT`, `README.md`, and `.gitignore`
- `.release.json`, the record of the commit a release came from and every path it released; the next release removes a path it lists that the theme no longer has

A change to any of them belongs in a release; everything else here is content.

## Build locally

Requires [uv](https://docs.astral.sh/uv/). Hugo is fetched at the version in `.hugo-version` when the `hugo` on your PATH is not that version.

```
uv run scripts/hugo.py
```

builds the production site into `public/` and indexes it for search with Pagefind. Arguments go to Hugo unchanged, for example `uv run scripts/hugo.py server` to preview the site. The build checks every piece against `CONTENT.md` and fails on one that breaks it, with a message that names the content file and the field, such as `content/posts/x/index.en.md: description is missing`.

## License

Code: [MIT](LICENSE). Writing and figures, the files in `content/`: [CC BY 4.0](LICENSE-CONTENT).
