export default {
  // --no-warn-ignored: eslint-ignorerte filer (f.eks. scripts/mcp/) skal ikke
  // feile gate'en med "File ignored"-warning under --max-warnings 0.
  "*.{ts,tsx}": ["prettier --write", "eslint --fix --max-warnings 0 --no-warn-ignored"],
  "*.{json,md,yaml,css}": ["prettier --write"],
};
