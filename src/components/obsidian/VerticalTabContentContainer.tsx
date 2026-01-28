import { h, ComponentChildren } from "preact";

export function VerticalTabContentContainer({
  children,
  className = "",
}: {
  children: ComponentChildren;
  className?: string;
}) {
  return (
    <div className={"vertical-tab-content-container " + className}>
      {children}
    </div>
  );
}
