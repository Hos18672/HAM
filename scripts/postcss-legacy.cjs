/**
 * The stylesheet, made readable for the older Chromium in TV and display
 * browsers (Samsung's Tizen sets — the Flip among them — run Chromium 85 or
 * 94). It runs after Tailwind and after the cascade layers have been
 * flattened (`@csstools/postcss-cascade-layers`): a browser older than
 * Chromium 99 drops every rule inside `@layer`, which is nearly all of
 * Tailwind and the components, so the site came up half-styled and
 * without its animations.
 *
 * Every addition is a fallback a current browser never reads, so the site
 * there renders exactly as before:
 *
 *  - Lightning CSS, aimed at Chromium 79: `:is()`, the colour functions and
 *    the prefixes get the older spellings beside them (logical properties
 *    excluded: it would turn them into `:lang()` rules for every browser).
 *  - The logical shorthands of Chromium 87 (`inset`, `inset-inline`,
 *    `margin-inline`…) spelled out, inside `@supports not (inset: 0)`.
 *  - A copy of each `:where()` rule with the `:where()` opened up, inside
 *    `@supports not (aspect-ratio: 1)` — the same release as `:where()`.
 *  - `vh` before every `dvh`/`svh`/`lvh`.
 *  - Each `aspect-ratio` written again as `--ham-ar`, which
 *    components/site/legacy-browser.tsx turns into a height where the
 *    browser has no `aspect-ratio` (Chromium 88).
 *  - Selector lists that mix `:has()`, `:focus-visible` or `:where()` with
 *    plain selectors split in two: an older browser drops the whole list
 *    for the one selector it cannot read. (The classes components/site/
 *    legacy-browser.tsx sets stand in for the `:has()` rules themselves.)
 */
const { transform, Features } = require('lightningcss');

const TARGETS = { chrome: 79 << 16, safari: 13 << 16, firefox: 78 << 16 };

/** Splits at the commas (or spaces) that are not inside brackets. */
function split(value, by) {
  const parts = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0 && (by === ',' ? c === ',' : /\s/.test(c))) {
      parts.push(value.slice(from, i).trim());
      from = i + 1;
    }
  }
  parts.push(value.slice(from).trim());
  return parts.filter(Boolean);
}

/** `:where(a, b) c` → `a c`, `b c`. */
function unwrapWhere(selector) {
  const at = selector.indexOf(':where(');
  if (at === -1) return [selector];
  let depth = 0;
  let end = -1;
  for (let i = at + 6; i < selector.length; i++) {
    if (selector[i] === '(') depth++;
    else if (selector[i] === ')' && --depth === 0) {
      end = i;
      break;
    }
  }
  if (end === -1) return [selector];
  const before = selector.slice(0, at);
  const after = selector.slice(end + 1);
  return split(selector.slice(at + 7, end), ',').flatMap((part) =>
    unwrapWhere(before + part + after),
  );
}

/**
 * The physical spelling of the Chromium 87 logical properties, as
 * [prop, value] pairs: `ltr` for every direction, `rtl` added under `[dir=rtl]`.
 */
function spellOut(prop, value) {
  const v = split(value, ' ');
  const pair = () => [v[0], v[1] ?? v[0]];
  const ltr = [];
  const rtl = [];
  const inline = (start, end) => {
    if (start !== undefined) {
      ltr.push(['left', start]);
      rtl.push(['right', start]);
    }
    if (end !== undefined) {
      ltr.push(['right', end]);
      rtl.push(['left', end]);
    }
    // The other side, put back where the left-to-right copy took it.
    if (start === undefined) rtl.push(['right', 'auto']);
    if (end === undefined) rtl.push(['left', 'auto']);
  };
  switch (prop) {
    case 'inset': {
      const [t, r = t, b = t, l = r] = v;
      ltr.push(['top', t], ['right', r], ['bottom', b], ['left', l]);
      break;
    }
    case 'inset-block': {
      const [s, e] = pair();
      ltr.push(['top', s], ['bottom', e]);
      break;
    }
    case 'inset-block-start':
      ltr.push(['top', value]);
      break;
    case 'inset-block-end':
      ltr.push(['bottom', value]);
      break;
    case 'inset-inline': {
      const [s, e] = pair();
      inline(s, e);
      break;
    }
    case 'inset-inline-start':
      inline(value, undefined);
      break;
    case 'inset-inline-end':
      inline(undefined, value);
      break;
    case 'margin-inline':
    case 'padding-inline':
    case 'margin-block':
    case 'padding-block': {
      // The longhands are much older than the shorthand, and keep the direction.
      const [s, e] = pair();
      ltr.push([`${prop}-start`, s], [`${prop}-end`, e]);
      break;
    }
    default:
      return null;
  }
  return { ltr, rtl };
}

const RISKY = /:has\(|:focus-visible|:where\(/;
const LOGICAL = /^(inset(-block|-inline)?(-start|-end)?|(margin|padding)-(inline|block))$/;
const NO_INSET = 'not (inset: 0)';
const NO_WHERE = 'not (aspect-ratio: 1)';

/** @type {import('postcss').PluginCreator<void>} */
module.exports = () => ({
  postcssPlugin: 'ham-legacy',
  OnceExit(root, { parse, AtRule, Rule, Declaration }) {
    // Lightning CSS first: it would fold the spelt-out longhands below back
    // into the shorthands.
    const { code } = transform({
      filename: root.source?.input.file ?? 'style.css',
      code: Buffer.from(root.toString()),
      targets: TARGETS,
      exclude: Features.LogicalProperties,
      minify: false,
      errorRecovery: true,
    });
    const next = parse(code.toString(), { from: root.source?.input.file });
    root.removeAll();
    root.append(next.nodes);

    root.walkRules((rule) => {
      const risky = rule.selectors.filter((s) => RISKY.test(s));
      if (!risky.length || risky.length === rule.selectors.length) return;
      rule.cloneBefore({ selectors: rule.selectors.filter((s) => !RISKY.test(s)) });
      rule.selectors = risky;
    });

    const fallbacks = [];
    root.walkRules((rule) => {
      if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;

      if (rule.selector.includes(':where(')) {
        const copy = rule.clone({ selectors: rule.selectors.flatMap(unwrapWhere) });
        fallbacks.push([
          rule,
          new AtRule({ name: 'supports', params: NO_WHERE, nodes: [copy] }),
          'before',
        ]);
      }

      const ltr = [];
      const rtl = [];
      rule.each((decl) => {
        if (decl.type !== 'decl' || !LOGICAL.test(decl.prop)) return;
        const spelt = spellOut(decl.prop, decl.value);
        if (!spelt) return;
        const important = decl.important;
        for (const [prop, value] of spelt.ltr)
          ltr.push(new Declaration({ prop, value, important }));
        for (const [prop, value] of spelt.rtl)
          rtl.push(new Declaration({ prop, value, important }));
      });
      if (!ltr.length) return;
      const copies = [new Rule({ selectors: rule.selectors, nodes: ltr })];
      if (rtl.length)
        copies.push(
          new Rule({
            selectors: rule.selectors.map((s) =>
              /^(html|:root)\b/.test(s) ? s : `[dir='rtl'] ${s}`,
            ),
            nodes: rtl,
          }),
        );
      fallbacks.push([
        rule,
        new AtRule({ name: 'supports', params: NO_INSET, nodes: copies }),
        'after',
      ]);
    });
    // Each beside its own rule, so it sits at the same place in the cascade.
    for (const [rule, wrapper, where] of fallbacks) rule[where](wrapper);

    root.walkDecls((decl) => {
      if (decl.prop === 'aspect-ratio') decl.cloneAfter({ prop: '--ham-ar', value: decl.value });
      if (/\d[dsl]vh\b/.test(decl.value)) {
        decl.cloneBefore({ value: decl.value.replace(/(\d)[dsl]vh\b/g, '$1vh') });
      }
    });
  },
});
module.exports.postcss = true;
