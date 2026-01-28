import { h, HTMLAttributes, JSX } from "preact";

/**
 * Basic <div /> but more descriptive.
 */

export const View = (
  props: JSX.IntrinsicAttributes & HTMLAttributes<HTMLDivElement>,
) => {
  return <div {...props} />;
};
