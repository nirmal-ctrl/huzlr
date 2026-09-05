# 🚀 Getting started with Strapi

## Author a Markdown blog in Strapi

The Blog content type has a **Content Markdown** field backed by Strapi's Rich
Text (Markdown) editor. After this schema is deployed and the Strapi admin is
rebuilt:

1. Open **Content Manager → Blog** in the deployed Strapi admin.
2. Paste the article body into **Content Markdown**.
3. Use the editor's **Preview** mode to check the formatting, then save and
   publish the entry.

The page renders the blog title separately, so omit a duplicate H1 from the
body when authoring directly in Strapi. Do not paste Markdown into the legacy
**Content** Blocks field: the Blocks editor stores structured JSON and can keep
pasted Markdown syntax as plain text. The Blocks field remains available so
existing entries continue to work during the migration.

## Publish a blog from the command line

The publisher accepts a Markdown file (recommended) or a JSON file containing
the Blog content-type fields. Markdown source is stored in `contentMarkdown`
without being converted to Strapi Blocks.

1. In Strapi, create an API token with `Blog: create` permission.
2. Add the token and CMS URL to `huzlr-cms/.env`:

   ```dotenv
   HUZLR_CMS_URL=https://your-cms.example.com
   HUZLR_CMS_API_TOKEN=your_token
   # Optional: prints the public article URL after publishing
   HUZLR_SITE_URL=https://huzlr.com
   ```

3. Preview the payload without making a request:

   ```sh
   cd huzlr-cms
   npm run publish:blog -- scripts/blog.example.md --dry-run
   ```

4. Publish it:

   ```sh
   npm run publish:blog -- path/to/article.md
   ```

The first H1 is used as the title and removed from `contentMarkdown` so the page
does not render it twice. The first paragraph is used as the description, while
the slug and publication date are generated automatically. All other Markdown
is preserved. Override metadata or connect existing CMS records with
command-line options:

```sh
npm run publish:blog -- path/to/article.md \
  --slug my-custom-slug \
  --author AUTHOR_DOCUMENT_ID \
  --tag TAG_DOCUMENT_ID \
  --cover-image-id 12
```

Run `npm run publish:blog -- --help` for every option. The API token must have
permission to create blogs and access any related records in the request.

For JSON input, `title`, `description`, and one content field are required. Use
`contentMarkdown` for a Markdown string. For backward compatibility, a Markdown
string in `content` is also mapped to `contentMarkdown`, while a Strapi Blocks
array in `content` is sent unchanged to the legacy Blocks field. Optional fields
are `slug`, `publishDate`, `authorDocumentId`, `tagDocumentIds`, and
`coverImageId`.

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/dev-docs/cli) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-build)

```
npm run build
# or
yarn build
```

## ⚙️ Deployment

Strapi gives you many possible deployment options for your project including [Strapi Cloud](https://cloud.strapi.io). Browse the [deployment section of the documentation](https://docs.strapi.io/dev-docs/deployment) to find the best solution for your use case.

```
yarn strapi deploy
```

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://strapi.io/blog) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>
