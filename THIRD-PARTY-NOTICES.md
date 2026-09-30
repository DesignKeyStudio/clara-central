# Third-Party Notices

Clara Central's own code is licensed under the
[PolyForm Noncommercial License 1.0.0](./LICENSE.md) — see [LICENSING.md](./LICENSING.md).
The third-party material below is **not** covered by that license. Each piece stays
under its original license, and those terms travel with the files.

This project incorporates material from the projects below. Dependencies
installed from the lockfile are not listed here — see `pnpm-lock.yaml` and run
`pnpm licenses list` for the full resolved tree. What follows is code and assets
**copied into this repository**, where the obligation travels with the file.

---

## UI components — `src/components/ui/`

The ~48 primitives in `src/components/ui/` were generated into this repo by the
[shadcn](https://ui.shadcn.com) CLI (`new-york` style) and the
[ReUI](https://reui.io) `base-nova` registry, as configured in
[`components.json`](./components.json). Both are copy-in registries by design:
the code becomes yours to edit, and many of these files have since been modified
for this project.

| Source | License | Upstream |
|---|---|---|
| shadcn/ui | MIT | https://github.com/shadcn-ui/ui |
| ReUI (Keenthemes) | MIT | https://github.com/keenthemes/reui |

Both licenses permit redistribution and modification, including commercially,
provided the copyright and permission notices are retained. The full notices are
reproduced under [License texts](#license-texts) at the end of this file. Neither
license grants trademark rights.

The upstream portions of these files remain available under MIT. The changes made
to them for this project are part of Clara Central and are covered by the project
license.

---

## Agent skills — `.claude/skills/`

Only this project's own skills (`qa-run`, `record-changelog`, `update-codemap`,
`update-component`) are committed. The third-party skills this project also uses
are **deliberately not vendored** — they are pinned by source and content hash in
[`skills-lock.json`](./skills-lock.json) and fetched with `npx skills add`.

For reference, that lockfile pins skills from:

| Source | License |
|---|---|
| [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) (Google LLC) | Apache-2.0 |
| [supabase/agent-skills](https://github.com/supabase/agent-skills) | MIT |
| [mattpocock/skills](https://github.com/mattpocock/skills) | MIT |

If you ever choose to commit copies of those instead of installing them, you take
on their notice requirements: ship the license texts, retain the existing
copyright headers (the Chrome DevTools material carries
`Copyright 2025 Google LLC / SPDX-License-Identifier: Apache-2.0`), and state any
modifications you made, as Apache-2.0 §4(b) requires.

---

## Fonts and icons

- **Lucide** icons, via the `lucide-react` dependency — ISC.
- **File-type thumbnails** — `public/{DOC,PDF,XLSX,PPTX,ZIP,IMAGE,LINK}.png`, used
  by `src/components/custom/file-type-thumb.tsx`. Per DesignKey Studio these were
  either drawn in-house by the project's designer or taken from a royalty-free
  icon set; in both cases they are redistributable with this repository.

  > **Open item before publishing:** confirm with the designer which of the two it
  > is, and record the answer here. If in-house, say so — DesignKey Studio owns
  > them and nothing further is required. If sourced, name the set and its license:
  > "royalty-free" is not one license but several, and the common free tiers
  > (Flaticon, Freepik, Icons8) require visible attribution, while CC0 / public
  > domain sets require none. Only the second case creates an obligation, and it is
  > satisfied by one line in this file.

---

## Documents — `CODE_OF_CONDUCT.md`

[`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) is the
[Contributor Covenant](https://www.contributor-covenant.org) version 2.1, adapted
only in its enforcement contact. The Covenant is licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), which requires
attribution and a statement of changes — both are in that file's Attribution
section. Its Community Impact Guidelines derive from
[Mozilla's enforcement ladder](https://github.com/mozilla/inclusion).

---

## Brand assets

`public/clara-central-logo.svg`, `public/clara-central-logo-mini.svg`, and the
"Clara Central" name are **not** covered by this project's software license, and no
license of any third-party component above grants trademark rights either. If you
share a modified copy of this project, replace the brand assets and product name
with your own.

---

## License texts

### shadcn/ui — https://github.com/shadcn-ui/ui

```text
MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### ReUI (Keenthemes) — https://github.com/keenthemes/reui

```text
MIT License

Copyright (c) 2025 Keenthemes Inc

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
