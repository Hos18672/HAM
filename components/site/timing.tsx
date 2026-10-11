import { Fragment } from 'react';

/**
 * A formatted schedule ("Montag · 19:00–21:00") with the time range kept on
 * one line: a narrow column would otherwise break it after the dash.
 */
export function Timing({ text }: { text: string }) {
  const parts = text.split(' · ');
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 ? ' · ' : null}
          {/\p{Nd}[:.٫]\p{Nd}/u.test(part) ? (
            <span style={{ whiteSpace: 'nowrap' }}>{part}</span>
          ) : (
            part
          )}
        </Fragment>
      ))}
    </>
  );
}
