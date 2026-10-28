# slugkit

Small string helpers for Node and the browser.

```ts
import { slugify, truncate, parseDuration } from 'slugkit';

slugify('Crème brûlée'); // "creme-brulee"
truncate('A long title', 6); // "A lon…"
parseDuration('90s'); // 90000
```

## Contributing

Run `npm install`, then `npm test`. Every fix needs a test. Keep PRs small and focused on one issue.
AI-assisted contributions are welcome when the PR says so.
