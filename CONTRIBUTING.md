# Contributing

Contributions are welcome: open an issue or a pull request.

## Checks

With Node 22.12 or later (what vitest asks for; the published package itself runs on Node 20):

```sh
npm install
npm test          # unit tests
npm run typecheck
npm run build     # compiles src/ into dist/
npm run smoke     # imports the built package as a consumer would, and runs it
```

CI runs them on every pull request, on Node 22 and 24.

## Releasing

1. Add the version's entry at the top of `CHANGELOG.md`.
2. Set the version, which commits and tags: `npm version 0.2.0` (or `patch`, `minor`, `major`).
3. Push the commit and the tag: `git push --follow-tags origin main`.

The Release workflow then runs the checks, creates the GitHub release with the changelog entry and the tarball attached, and, once npm publishing is set up, publishes to npm. It can also be started by hand from the Actions tab (Run workflow, on `main`) once the version is on `main`: it then creates the tag itself.

## Publishing to npm

The first publication is done by hand; it creates the package on npm:

```sh
npm login
npm publish --dry-run   # lists what would be sent
npm publish             # prepublishOnly runs the checks and the build first
```

Later releases can be published by the Release workflow, without any token:

1. On npmjs.com, in the package's settings, add a trusted publisher: GitHub Actions, organization or user `theiereman`, repository `pixelcrush`, workflow filename `release.yml`.
2. On GitHub, in the repository's settings (Secrets and variables, Actions, Variables), set `PUBLISH_TO_NPM` to `true`.

Every tag then publishes with provenance; npm asks that the first publish through a new trusted publisher happens within two days of configuring it. To use a token instead, store a granular access token as the `NPM_TOKEN` secret and give the publish step `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` in its `env`.
