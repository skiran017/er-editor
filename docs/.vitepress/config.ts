import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'ER Editor',
  description: 'A web-based ER diagram editor for educational use (Chen notation).',
  // Hide internal/historical pages from the public site nav.
  srcExclude: ['archive/**', 'superpowers/**'],
  // The mirrored CHANGELOG.md links to repo source paths (e.g. `./src/...`)
  // that resolve from the repo root, not from `docs/`. User-docs pages also
  // link to siblings that are added in later phases. Allow these so the
  // build does not regress while Phase D pages roll in incrementally.
  ignoreDeadLinks: [
    /^\.\/src\//,
    /^\.\/tests\//,
    /^\.\/tools$/,
    /^\.\/moodle$/,
    /^\.\/tasks\//,
  ],
  // Screenshots referenced from markdown live in `docs/public/screenshots/`
  // and are served at runtime as static assets. Some PNGs are captured in a
  // separate manual pass; until they exist, prevent the Vue SFC compiler
  // from turning `<img src="/screenshots/...">` into an ES import (which
  // would fail to resolve at build time). Disabling `img.src` in
  // `transformAssetUrls` leaves the literal absolute URL in the rendered
  // HTML — the browser shows a broken image until the PNG is added,
  // which is acceptable.
  vue: {
    template: {
      transformAssetUrls: {
        video: ['src', 'poster'],
        source: 'src',
        img: [],
        image: ['xlink:href', 'href'],
        use: ['xlink:href', 'href'],
      },
    },
  },
  themeConfig: {
    nav: [
      { text: 'User Docs', link: '/user/' },
      { text: 'Dev Docs', link: '/dev/' },
      { text: 'API Reference', link: '/api/' },
      { text: 'Changelog', link: '/changelog' },
    ],
    sidebar: {
      '/user/': [
        { text: 'Welcome', link: '/user/' },
        { text: 'Quick start', link: '/user/quick-start' },
        { text: 'Tools', link: '/user/tools' },
        {
          text: 'Common tasks',
          collapsed: false,
          items: [
            { text: 'Building a diagram', link: '/user/tasks/building' },
            { text: 'Properties', link: '/user/tasks/properties' },
            { text: 'Cardinality & participation', link: '/user/tasks/cardinality' },
            { text: 'Validation', link: '/user/tasks/validation' },
            { text: 'Files', link: '/user/tasks/files' },
            { text: 'Exporting', link: '/user/tasks/exporting' },
          ],
        },
        { text: 'Keyboard shortcuts', link: '/user/shortcuts' },
        { text: 'Embedding in Moodle', link: '/user/moodle' },
      ],
      '/dev/': [
        { text: 'Getting started', link: '/dev/' },
        { text: 'Contributing', link: '/dev/contributing' },
        {
          text: 'Architecture',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/dev/architecture/overview' },
            { text: 'Layers', link: '/dev/architecture/layers' },
          ],
        },
        {
          text: 'Concepts',
          collapsed: false,
          items: [
            { text: 'Domain', link: '/dev/concepts/domain' },
            { text: 'State', link: '/dev/concepts/state' },
            { text: 'Interaction FSM', link: '/dev/concepts/interaction-fsm' },
            { text: 'Notation plugins', link: '/dev/concepts/notation-plugins' },
            { text: 'Codecs', link: '/dev/concepts/codecs' },
          ],
        },
        {
          text: 'Recipes',
          collapsed: true,
          items: [
            { text: 'Add a tool', link: '/dev/recipes/add-tool' },
            { text: 'Add an edge', link: '/dev/recipes/add-edge' },
            { text: 'Add a codec', link: '/dev/recipes/add-codec' },
            { text: 'Add a validation rule', link: '/dev/recipes/add-validation-rule' },
          ],
        },
        {
          text: 'Reference',
          collapsed: true,
          items: [
            { text: 'Java XML format', link: '/dev/reference/java-xml-format' },
            { text: 'Chen validation rules', link: '/dev/reference/chen-validation-rules' },
            { text: 'URL parameters', link: '/dev/reference/url-parameters' },
            { text: 'Moodle integration', link: '/dev/reference/moodle-integration' },
          ],
        },
        { text: 'Testing', link: '/dev/testing' },
        { text: 'Build & deploy', link: '/dev/build-deploy' },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/skiran017/er-editor' },
    ],
  },
})
