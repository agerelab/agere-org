import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // TECH-01 §10.1: no raw SQL outside repositories. Only a module's repository, the db layer and
  // scripts may build SQL; everything else goes through a repository that takes ctx first.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/modules/*/repository.ts", "src/modules/*/repository/**", "src/db/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "drizzle-orm", importNames: ["sql"], message: "Raw SQL only in a module repository (TECH-01 §10)." },
            { name: "postgres", message: "Database access only through src/db and module repositories (TECH-01 §10)." },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "docs/**", "node_modules/**"]),
]);
