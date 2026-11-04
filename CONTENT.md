# Content model

The shape of a post and a note, and of a project (see Projects): the front matter a content file holds and the files its page bundle carries. Templates read this shape, and the later connector to linkedin-content-manager writes it ([DECISIONS/006](DECISIONS/006-no-publishing-in-this-project.md)). The fields mirror that repository's planned site export: the final text per language; the chart per language, as an ECharts option, a PNG, and alt text; the chart's data as CSV; the sources; the method; and the facts for a reproduce block.

Spec: [specs/004-content-model-and-samples.md](specs/004-content-model-and-samples.md).

## Pieces and bundles

A piece is a post or a note. A **post** is the fuller version of one LinkedIn post: one chart, its data, the method, and the sources, or one image instead of the chart (see A post led by an image). A **note** is the same with more room: any number of figures, or none, and no LinkedIn post of its own.

Readers see the two kinds as a **post** and a **blog post**, in Spanish *post* and *entrada de blog* ([spec 018](specs/018-names-and-wording.md)). A blog post sets `type` to `note` in its front matter (`type: note`), a name readers never see. Posts sit in `content/posts/` and live at `/<lang>/posts/<slug>/`. Blog posts sit in `content/notes/` (the samples' in `samples/notes/`) and live at `/<lang>/blog/<slug>/` (the samples' at `/<lang>/samples/blog/<slug>/`), as the permalinks in `hugo.toml` set. The `<slug>` of an address is the content file's `slug` when it sets one, and otherwise the bundle folder's name, so each language may have its own address (see `slug`). The notes folder renders no page of its own, so `/en/blog/` is no page and `/es/blog/` is the Spanish writing page, titled Blog; the English writing page is `/en/writing/`.

Each piece is a Hugo page bundle: a folder holding one content file per language and every file the piece shows.

```
<slug>/
  index.en.md          the English version: front matter and final text
  index.es.md          the Spanish version
  wages.en.png         the English chart as an image
  wages.en.json        the English chart's ECharts option
  wages.en.csv         the English chart's data
  wages.es.png         the Spanish chart, and so on
  ...
```

Every file a figure names carries its language before the extension, `<name>.<lang>.<ext>`. Hugo gives such a file to that language's page only; the language in the name is what keeps a piece in one language from losing its files. Real content goes under `content/`; the samples live under `samples/`, which only the test build and the samples preview mount (see Samples). The development build, which the dev server serves, mounts no samples, so it shows the site as it ships ([spec 016](specs/016-home-refinements.md)).

## Front-matter fields

Front matter is YAML between `---` lines. The `Required` column says who must set a field: `yes` for every piece, `posts` for posts only, `notes` for notes only, `no` for nobody. Nested fields are written `parent.field`.

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `title` | text | yes | The piece's title, in the file's language. |
| `short_title` | text | no | A shorter title for the page's `<title>`, in the file's language. A page's `<title>` is its title, ` · `, and the site's name, `Brandon Mora`, and runs at most 60 characters, the length search results show; a piece whose title would run longer sets `short_title`, and its `<title>` uses that instead. The heading, lists, cards, link previews, feeds, `llms.txt`, and structured data keep the full title. The build rejects one that is empty or not text, and a piece whose `<title>`, the site's name included, would run over 60 characters, naming `short_title` when it is set and `title` when it is not. |
| `description` | text | no | What search results and link previews show for the piece: one or two sentences in the file's language, at most 160 characters, written or approved by the author. It is the page's meta description, its Open Graph and Twitter description, and the `description` of its structured data. Without it, the piece takes the start of its text, leaving out image captions and alt text, cut at a word break within 160 characters. The build rejects one that is empty, not text, or longer than 160 characters. |
| `date` | date, `YYYY-MM-DD` | yes | The publication date. Two versions of one piece share it. |
| `lastmod` | date, `YYYY-MM-DD` | no | The date the piece last changed, when it should not be read from history. It is the page's modified date: `dateModified` in its structured data, its `article:modified_time`, and its `lastmod` in the sitemap. Without it, the modified date is the day of the last commit that touched the content file, and in a copy without git history, the piece's `date`. It never reads earlier than `date`: a `lastmod` before it shows the `date`. Hugo itself rejects a malformed `lastmod`, as it does a malformed `date`. |
| `type` | `post` or `note` | yes | The kind of piece. |
| `topics` | list of slugs | yes | One or more of the five topic areas below. Any other slug is unknown. |
| `slug` | text | no | The last part of the piece's address in the file's language: `/<lang>/posts/<slug>/` or `/<lang>/blog/<slug>/`, and the same under `/<lang>/samples/`. Lowercase letters `a` to `z`, digits, and single hyphens between them, such as `salarios-y-exposicion-a-la-ia`. Without it, the address takes the bundle folder's name. A slugged page leaves nothing at the folder's address in that language; translations stay linked through `translationKey`, and every link, alternate, list, feed, and sitemap entry uses the slugged address. The build rejects one that is empty, not text, or of another form, and two pages of one language at one address, whether two slugs alike or a slug equal to another page's folder name. |
| `translationKey` | text | no | Joins the versions of one piece across languages; see Translations. A piece in one language may leave it out, or set it ahead of a translation on its way. |
| `linkedin` | URL | posts | The LinkedIn post this page gives a permanent home. A note may set it when it began as one. |
| `figures` | list | posts | The charts the piece shows, in order. A post has exactly one, or none when its translation's chart stands in for it or when it leads with an `image`; a note has any number, or none. |
| `figures.png` | file name | yes | The chart as an image, a PNG in the bundle at 1200×1200 or 1080×1350. Required in every figure. |
| `figures.option` | file name | no | The ECharts option, a JSON object in the bundle. Without it the page shows the PNG alone. |
| `figures.csv` | file name | yes | The chart's data, a CSV in the bundle with a header row and at least one data row. Required in every figure. |
| `figures.alt` | text | yes | Alt text for the PNG, in the file's language: what the chart shows and what it says. Required in every figure. |
| `sources` | list | posts | The sources the piece cites, each with `title` and `url`. A post led by an image may leave it out. |
| `sources.title` | text | yes | How a source is cited. Required in every source. |
| `sources.url` | URL | no | Where a source lives. |
| `method` | text | posts | The method note: how the numbers were made, in the file's language. A post led by an image may leave it out. |
| `image` | map | no | The image a post leads with instead of a chart (see A post led by an image). Posts only; a post sets `image` or a chart, never both. |
| `image.src` | file name | yes | The image, a `.png`, `.jpg`, or `.webp` file in the bundle. Required when there is an image. |
| `image.alt` | text | yes | Alt text for the image, in the file's language. Required when there is an image. |
| `datasets` | list | no | The datasets behind the figures, for the reproduce block, when the author publishes them. |
| `datasets.url` | URL | yes | Where the dataset was retrieved. Required in every dataset. |
| `datasets.license` | text | yes | The dataset's license, as the export declares it. The site shows it and does not check it. Required in every dataset. |
| `datasets.retrieved` | date, `YYYY-MM-DD` | yes | When the dataset was retrieved. Required in every dataset. |
| `datasets.checksum` | SHA-256 hex digest | no | The digest of the retrieved file, 64 lowercase hex characters, optionally prefixed `sha256:`, when there is one. |
| `code_version` | text | no | The version of the code that made the figures, such as `linkedin-content-manager@<commit>`, when the author publishes it. |
| `command` | text | no | The command that regenerates the figures, when there is one. |
| `featured` | `true` | no | Shows the piece among home's featured cards (see Featured). It needs a chart, its own or its translation's, a post's `image`, or an image in its text, to lead its card. |

The body below the front matter is the piece's final text in that language. Dates in front matter are quoted or bare `YYYY-MM-DD`; numbers in text follow [DECISIONS/005](DECISIONS/005-dates-and-numbers.md).

A note that carries figures, sources, a method, or datasets uses the same fields with the same rules; it is only not required to carry them.

### Reproduction is optional

Spec 004 required `datasets`, `code_version`, and each dataset's `checksum` on every post. Since [spec 013](specs/013-content-model-and-samples-refresh.md), `datasets`, `code_version`, `command`, and `datasets.checksum` are optional on every piece, because the author won't always publish how to reproduce a piece. For linkedin-content-manager's export this changes only that: it may leave any of the four out, and when it sets one, the field keeps its type and form above. A dataset it lists still carries `url`, `license`, and `retrieved`.

The reproduce block shows when a piece has datasets, a code version, or a command, and shows each line only when its field is set: a dataset's link, license, and retrieval date, its checksum when it has one, then the code version and the command. A piece with none of the three has no reproduce block.

The build also sets `sample: true` on every page under `samples/`, through the `cascade` in `samples/_index.<lang>.md`. Content files do not set it themselves.

## Files

The `Required` column uses the same values as above. `<lang>` stands for `en` or `es`, and `*` for any name.

| File | Required | Meaning |
| --- | --- | --- |
| `index.<lang>.md` | yes | One content file per language the piece exists in: front matter and final text. At least one. |
| `*.<lang>.png` | posts | A chart as an image, named by `figures.png`. 1200×1200 or 1080×1350 pixels. Every figure has one. |
| `*.<lang>.json` | no | A chart's ECharts option, named by `figures.option`: a JSON object. |
| `*.<lang>.csv` | posts | A chart's data, named by `figures.csv`: UTF-8, a header row, at least one data row. Every figure has one. |
| `*.png` | no | An image a note's text shows, named in the text (see Images in the text), or the image a post leads with, named by `image.src`. |
| `*.jpg` | no | An image a note's text shows, or a post's `image`, as a JPEG. |
| `*.webp` | no | An image a note's text shows, or a post's `image`, as a WebP. |

A bundle carries no file that its front matter or its text does not name.

## A post led by an image

A post leads with one chart or with one image ([spec 019](specs/019-posts-led-by-an-image.md)). Not every LinkedIn post has a chart: a launch may lead with a graphic or a screenshot. Such a post sets `image`, a map with `src` and `alt`, the same shape as a project's image, instead of `figures`:

```yaml
image:
  src: launch.png
  alt: "What the image shows, in the file's language."
```

- It carries no `figures`, and may leave out the method, the sources, the datasets, and the rest of the reproduce block, since there is no data behind it. It may still cite `sources`, and it still needs `linkedin`.
- Its page shows the image where a chart would be, after the text, with its alt text, served from the bundle at most 1200 pixels wide as WebP. It shows no figure, table, method, or reproduce block. Its featured card leads with the image. Its link preview, and the `image` of its structured data, is the image fitted to 1200×630 on the light paper, with its alt text (spec 020).
- Only the post's own image leads it: a translation's image does not stand in, as a translation's chart does. A file without a language serves every version, so both versions may name one file, each with its own alt text.
- One image at most. A piece with several images is a blog post, whose text shows them.
- Everything else holds: its kind is `post`, it sits under `/posts/`, and it is listed like any post.

The build rejects a post with neither a chart (its own or its translation's) nor an image, and a post with both.

An ECharts option (`figures.option`) takes every color from the chart tokens (`tokens/chart.tokens.json`) of a light set, `standard` or `high`, and carries no other color, not even a white or a black. The site draws the option as it is on a light page of the same contrast level. On a page of the other level, or on a dark page, it draws each color as the token of the same role in that page's set (`standard`, `high`, `dark-standard`, or `dark-high`), with that set's chart theme ([DECISIONS/012](DECISIONS/012-interactive-charts-follow-the-page.md)); the site tells which light set an option was built from by the colors only one of the two sets holds. A color that is not a light-set token has no dark counterpart and would show unchanged on the dark surface. The PNG stays on light paper in every theme.

## Images in the text

A note's text may show images from its bundle, such as an article's cover or a screenshot, with Markdown image syntax: `![alt text](file "caption")`. They are pictures, not charts: a chart is a figure, with its data, and goes in `figures`.

- The file is a `.png`, `.jpg`, or `.webp` in the bundle. Nothing loads from another origin, so an image elsewhere is linked, not shown. A file named `<name>.<lang>.<ext>` serves only that language's version. A file without a language serves every version of a bundle that has an English one; Hugo gives it to the default language and shares it from there, so a piece only in Spanish names its images `<name>.es.<ext>`. Each version's text writes its own alt text and caption.
- The alt text, between the brackets, is required and written in the file's language.
- The caption, in quotes after the file name, is optional. It may hold inline Markdown, such as a link or a credit: `![alt](cover.png "Photo by [Name](https://example.org/)")`.
- An image alone in its paragraph shows as a figure at the column's width, its caption below; an image inside a line of text shows inline. The page serves each image at most 1200 pixels wide, as WebP.
- An image inside an HTML comment, `<!-- … -->`, or in fenced code is not shown and not checked, so a reference can wait in a comment until its file arrives.
- A blog post without a chart takes its first image as its link preview, and as the `image` of its structured data, fitted to 1200×630 on the light paper with its alt text (spec 020).

A post's text shows no images: its picture is its chart, or its `image`.

## What the build rejects

Every build, production included, checks each piece against the tables above, through `partial "content/validate.html"`; a page is a piece when it sets `type` or sits under a `posts/` or `notes/` folder. A required field or file that is missing, a field of the wrong type or shape (a list where text belongs, a date or checksum in another form, a URL that is not one), a topic outside the five, a post with more than one figure, a post with neither a chart (its own or its translation's) nor an `image`, a post with both a chart and an `image`, a `description` longer than 160 characters, a `slug` of another form than lowercase letters, digits, and single hyphens, two pages of one language at one address, an empty `short_title` or one that is not text, a `<title>` over 60 characters, a PNG of another size, a CSV without a data row, an option that is not a JSON object, an image in the text that has no alt text, is not a `.png`, `.jpg`, or `.webp` file in the bundle, or sits in a post's text, and a bundle file that no figure, no `image`, and no image in the text names: each fails the build with a message that starts with the content file's path and names the field or file, such as `samples/posts/x/index.en.md: figures[0].png is missing`. Hugo itself rejects a malformed `date`.

## Featured

Home shows up to three featured cards, above the projects and the writing list (spec 010). A post, note, or project is featured by `featured: true` in its front matter, in each language where it should show. The cards are the newest featured items of the page's language: a piece by its date, a project by 1 January of its start year. Past three, the older ones wait until a newer one stops being featured.

A card leads with an image, so a featured item must have one. A post led by an image leads with that image. A post or note otherwise leads with its first chart (a post without a chart takes its translation's, as its page does), or else the first image of its text. A project leads with its `image`. The build fails on a featured item with none of these. The chart PNGs sit on their paper and wipe in as they scroll into view; home loads no chart code.

## Topics

Every piece belongs to one or more of these areas. The slug goes in `topics`; the names come from `i18n/<lang>.toml`, under `topic_<slug>`.

The topics come from configuration, `params.topics` in `hugo.toml`. A topic has a view in a language only once a post, note, or project of that language files under it; projects count, like pieces. The view lists its posts and notes, then its projects: `/en/topics/<slug>/`, and `/es/temas/<slug>/` with the Spanish name as the slug, in lowercase, without accents, words joined by hyphens (`/es/temas/economia-de-la-ia/`). The folder name comes from `topicsPath` in each string file.

`content/_content.gotmpl` makes the views from `params.topics` and the string files. The site has no pages yet when it runs, so `layouts/_partials/topics/filed.html` reads the content files themselves: every Markdown file in the folders mounted as content in that environment (`content/`; in development `gallery/` too; and in test and the samples preview `samples/` and `gallery/` too), skipping drafts. A topic with nothing filed in a language has no view there, and so no filter, no sitemap entry, and no llms.txt entry. The topic filters on home and on the views show only while at least two topics have a view in the language. Filing the first piece under a topic is all it takes to give it its view.

| Slug | English | Spanish |
| --- | --- | --- |
| `minds-and-machines` | Minds and machines | Mentes y máquinas |
| `economics-of-ai` | Economics of AI | Economía de la IA |
| `living-with-ai` | Living with AI | Convivir con la IA |
| `open-science` | Open science | Ciencia abierta |
| `working-with-ai` | Working with AI | Trabajar con IA |

## Translations

The versions of one piece are content files in the same bundle, one per language, that share a `translationKey`. Hugo links them: each version's page lists the other as its translation, so the link always runs both ways, and the page links it with `hreflang`. The key is any text unique to the piece; the samples use `sample-<slug>`.

A piece may exist in one language. Its bundle then holds one content file, and its page has no translation link; it may set its `translationKey` ahead of the translation, which then joins it. Nothing is machine-translated to fill the gap.

Each version carries its own title, text, alt text, method, and source titles in its language. The data, datasets, code version, and command describe the same work and are repeated in each version.

### A chart missing in one language

When a post in one language has no `figures` and its translation has them, the page uses the translation's chart and marks it as a fallback, so the template can say that the chart is in the other language. Only posts fall back; a note without figures has none.

## The resolved model

Templates read a piece through `partial "content/model.html" .`, which returns the model below with topics named, translations linked, and fallback charts resolved. The development and test builds also write it as JSON at `<page URL>model.json`; production does not.

| Key | Value |
| --- | --- |
| `kind` | `post` or `note`, from `type` |
| `lang` | the page's language |
| `title`, `date` | as in front matter, the date as `YYYY-MM-DD` |
| `sample` | true for samples |
| `source` | the content file's path from the repository root |
| `topics` | a list of `{slug, name}`, the name in the page's language |
| `translations` | each other language's version, as language → absolute URL |
| `linkedin` | the LinkedIn URL, or null |
| `figures` | a list of `{lang, fallback, option, png, width, height, alt, csv}`: `lang` is the language the chart was made for, `fallback` is true when it is the other language's chart, `option`, `png`, and `csv` are URLs (`option` may be null), and `width` and `height` are the PNG's pixels |
| `image` | a post's leading image as its page serves it, `{src, width, height, alt}`, or null when the post leads with a chart and for every note |
| `images` | the images the text shows, in order, as a list of `{src, width, height, alt, caption}`: `src` is the URL the page serves, `width` and `height` its pixels, and `caption` the caption as written, or empty; empty for a piece whose text shows none |
| `sources`, `method`, `datasets`, `code_version`, `command` | as in front matter; empty when a piece leaves them out, and `command`, like a dataset's `checksum`, null when absent |

## Projects

A project is the third kind of content, beside posts and notes: work the author made or led, with a short text and its links ([specs/011-projects.md](specs/011-projects.md)). Like a piece, each project is a page bundle with one content file per language, `index.<lang>.md`, and the files it shows. Real projects go under `content/projects/<slug>/`; the samples live under `samples/projects/<slug>/`. A project's page is `/en/projects/<slug>/` and `/es/proyectos/<slug>/`, where `<slug>` is the content file's `slug` when it sets one and otherwise the folder's name (`hugo.toml`, permalinks); a sample's sits under `/<lang>/samples/` the same way.

```
<slug>/
  index.en.md          the English version: front matter and a short text
  index.es.md          the Spanish version
  cover.png            the project's image, when it has one, shared by both versions
```

### Project fields

The `Required` column reads as for pieces: `yes` for every project, `no` for none. Nested fields are written `parent.field`.

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `title` | text | yes | The project's name, in the file's language. |
| `short_title` | text | no | A shorter name for the project page's `<title>`, as for pieces: the `<title>`, ` · Brandon Mora` included, runs at most 60 characters, and the page's heading, cards, link previews, and structured data keep the full title. Same rejections as a piece's `short_title`. |
| `summary` | text | yes | One line on what the project is, in the file's language. It is also the project page's meta, Open Graph, and Twitter description; a project has no `description` field. |
| `years` | map | yes | When the project ran: `start` and, once it ended, `end`. |
| `years.start` | year, `YYYY` | yes | The year the project began. |
| `years.end` | year, `YYYY` | no | The year it ended, not before `start`. An ongoing project leaves it out. |
| `role` | text | yes | The author's role in the project, in the file's language. |
| `topics` | list of slugs | yes | One or more of the five topic areas, as for pieces. |
| `slug` | text | no | The last part of the project's address in the file's language: `/en/projects/<slug>/` or `/es/proyectos/<slug>/`, and the same under `/<lang>/samples/`. Same form, fallback, and rejections as a piece's `slug`. |
| `translationKey` | text | no | Joins the versions of one project across languages, as for pieces. A project in one language leaves it out. |
| `links` | list | no | Where the project lives, in the order the page lists them. |
| `links.label` | `repository`, `website`, `writing`, or `talk` | yes | What a link points to. The page names it from the string files. Required in every link. |
| `links.url` | URL | yes | Where it points. Required in every link. |
| `image` | map | no | An image of the project, for its card and page. |
| `image.src` | file name | yes | The image, a `.png`, `.jpg`, or `.webp` file in the bundle. Required when there is an image. |
| `image.alt` | text | yes | Alt text for the image, in the file's language. Required when there is an image. |
| `featured` | `true` | no | Shows the project among home's featured cards (see Featured). It needs an `image` to lead its card. |

The body below the front matter is the project's text in that language: a short text, not a case study. A project sets no `date` or `type`; `years` places it in time.

### Project files

| File | Required | Meaning |
| --- | --- | --- |
| `index.<lang>.md` | yes | One content file per language the project exists in. At least one. |
| `*.png` | no | The image, named by `image.src`. |
| `*.jpg` | no | The image as a JPEG, named by `image.src`. |
| `*.webp` | no | The image as a WebP, named by `image.src`. |

A project's bundle carries no file that `image.src` does not name. An image without a language in its name serves every version; `<name>.<lang>.<ext>` keeps it to one.

### What the build rejects in a project

Every build checks each project against the tables above, through the same `partial "content/validate.html"` as pieces; a page is a project when it sits under a `projects/` folder. A required field that is missing, a field of the wrong type or shape (a list where text belongs, a year not written `YYYY`, an end before the start, a label outside the four, a URL that is not one, a `slug` of another form, a `short_title` that is empty), a `<title>` over 60 characters, two projects or pages of one language at one address, a topic outside the five, an image that is not in the bundle, and a bundle file no field names: each fails the build with the same message form as for pieces, the content file's path and then the field, such as `samples/projects/x/index.en.md: summary is missing`.

### The project model

Templates read a project through `partial "content/model.html" .`, like a piece. The development and test builds also write it at `<page URL>model.json`; production does not.

| Key | Value |
| --- | --- |
| `kind` | `project` |
| `lang`, `sample`, `source`, `translations` | as for pieces |
| `title`, `summary`, `role` | as in front matter |
| `years` | `{start, end}`, each a year as a number; `end` is null for an ongoing project |
| `topics` | a list of `{slug, name}`, the name in the page's language |
| `links` | a list of `{label, url}`, in front-matter order; empty when the project has none |
| `image` | `{url, alt}`, `url` the image's absolute URL, or null when the project has none |

## Samples

The samples under `samples/` are synthetic: made-up numbers, datasets on reserved example domains (`*.example`), and LinkedIn links on `linkedin.example`. Every sample page shows a notice from the string files that it is a sample.

Where they build: the test build (`--environment test`, `config/test/hugo.toml`), which the checks read, and the samples preview (`--environment samples`, `config/samples/hugo.toml`), which serves the same content with search on the dev server: `uv run scripts/hugo.py server --environment samples`. Since [spec 016](specs/016-home-refinements.md), the development build and its dev server (`uv run scripts/hugo.py server`) hold no sample, so they show the site as it ships; the production build holds none either. The design gallery's figure specimen takes its downloads from copies of `posts/ai-and-wages`'s files in `gallery/`, so it needs no sample in development.

Together the samples cover every case the model allows:

| Sample | Covers |
| --- | --- |
| `posts/ai-and-wages` | a full post of about 600 words in both languages, each with its own interactive chart: a time series |
| `posts/citation-share` | a short post in English only; a chart as a PNG with no ECharts option; a post with no datasets, code version, or command, so no reproduce block |
| `posts/replication-rates` | a post with a 1080×1350 chart, a slope chart; a post whose Spanish chart is missing, so the Spanish page uses the English one |
| `notes/ai-at-work-in-the-region` | a long note in both languages with headings, footnotes, and two figures in each: a map and a coefficient plot |
| `notes/reading-the-brain` | a note in both languages with no chart, with headings and a footnote |
| `notes/dos-figuras` | a note in Spanish only with two figures, the second a PNG on the 1080×1350 canvas with no ECharts option; a dataset without a checksum next to one with it |
| `projects/open-catalog` | a project in both languages, with an image, an end year, and three links |
| `projects/field-notes` | a project in English only, ongoing, with no image and one link |

The samples read as finished pieces, with synthetic numbers. Their figures are drawn with the chart system's own forms by `uv run scripts/sample_chart.py <spec.json> <out-dir> <name> <lang> <width>x<height>`, from a spec in the form the chart gallery reads (`gallery/charts/*.json`); the script writes the ECharts option and the PNG, and the CSV beside them holds the same numbers. A figure with no ECharts option keeps the PNG and drops the option. Each sample dataset's checksum, where it has one, is the SHA-256 of the figure's CSV.
