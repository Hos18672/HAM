// Tailwind first; then the cascade layers flattened and the older spellings
// added beside the new ones, for the older Chromium in TV and display
// browsers (scripts/postcss-legacy.cjs says what and why).
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    '@csstools/postcss-cascade-layers': {},
    './scripts/postcss-legacy.cjs': {},
  },
};
