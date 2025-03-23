import eslint from "@eslint/js";
import prettier from "eslint-plugin-prettier/recommended";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          caughtErrors: "all",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  prettier,
]);
