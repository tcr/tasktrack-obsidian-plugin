import { useEffect, useRef } from "preact/hooks";
import { setIcon } from "obsidian";
import { h } from "preact";

export function Icon({
  icon,
  className = "",
}: {
  icon: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    setIcon(ref.current, icon);
  }, [icon]);

  return <div className={"w-4.5 h-4.5 " + className} ref={ref} />;
}
