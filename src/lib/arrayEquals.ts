export default function arrayEquals<T>(
  a: ArrayLike<T>,
  b: ArrayLike<T>,
): boolean {
  return (
    a.length === b.length &&
    (Array.prototype.every.call(
      a,
      (val: T, index: number): boolean => val === b[index],
    ) as boolean)
  );
}
