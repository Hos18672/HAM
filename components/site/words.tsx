import type { CSSProperties, ElementType } from 'react';

/**
 * Text that arrives a word at a time.
 *
 * The same reveal `EditableText` performs, for headings that are not managed
 * content — section heads, card titles that come from a fixed string. It rides
 * the scroll observer's armed/in attributes rather than carrying its own, so a
 * page with no JavaScript simply shows the text.
 *
 * The split is presentational: whitespace is preserved between the spans, so
 * the element's text content — and therefore its accessible name — is exactly
 * what was passed in.
 */
export function Words({
  children,
  as: Tag = 'span',
  scale = 'lines',
  className,
  style,
}: {
  children: string;
  as?: ElementType;
  scale?: 'lines' | 'hero' | 'tight';
  className?: string;
  style?: CSSProperties;
}) {
  const parts = children.split(/(\s+)/);
  let index = -1;
  return (
    <Tag className={className} style={style} data-rise data-words={scale}>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part)) return part;
        index += 1;
        return (
          <span key={i} className="word" style={{ '--ci': index } as CSSProperties}>
            {part}
          </span>
        );
      })}
    </Tag>
  );
}
