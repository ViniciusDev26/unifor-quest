// Every commit of a pull request is checked by CI (ADR 0086): with merge commits, each one
// reaches main, and semantic-release reads each one to decide the version and the release
// notes. The types are the ones CONTRIBUTING.md lists; anything else would be ignored by
// the release, silently.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'perf', 'build', 'docs', 'refactor', 'test', 'ci', 'chore', 'revert'],
    ],
    // The description is Portuguese and full of proper nouns (Dona Célia, NULL, ADR 0086):
    // forcing a case would only get in the way.
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
    // Bodies carry links, paths and co-author lines that do not wrap.
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
}
