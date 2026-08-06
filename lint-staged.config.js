export default {
  "*.{ts,tsx}": ["prettier --write", "eslint --fix --max-warnings 0"],
  "*.{json,md,yaml,css}": ["prettier --write"],
};
