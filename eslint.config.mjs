// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated output. Without these, a `pnpm lint` run after `pnpm build-storybook`
    // walks the bundled Storybook and reports hundreds of thousands of problems in
    // vendored JS, burying the handful that are actually ours.
    "public/storybook/**",
    "storybook-static/**",
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
    "prisma/generated/**",
    // Claude Code agent tooling — Node CommonJS hook scripts, not app code. They
    // are not part of any build or bundle, and the Next.js/React rules here don't
    // apply to them.
    ".claude/**",
  ]),
  ...storybook.configs["flat/recommended"],
  {
    // Vendored ReUI / shadcn primitives, copied in from upstream rather than
    // authored here. React Compiler's rules flag real patterns in them (setState
    // in effects, ref reads during render, manual memoization the compiler can't
    // preserve), but the fixes belong upstream — rewriting them locally means
    // re-doing it on every `shadcn add` that refreshes a primitive. Reported as
    // warnings so they stay visible without blocking CI on code we don't own.
    files: ["src/components/reui/**", "src/components/ui/**"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
