import { usePlugin } from "@/context/PluginContext";
import { useSelect } from "downshift";
import { h, TargetedEvent, ComponentChild } from "preact";

export interface DropdownItem<T> {
  value: T;
  label: ComponentChild;
}

// Platform detection utility
function useMacOSCheck() {
  const plugin = usePlugin();

  const enabled = plugin && plugin.settings?.dropdownEmulation;

  // eslint-disable-next-line obsidianmd/platform, @typescript-eslint/no-deprecated -- necessary way to determine OS for Mac-specific styling
  return enabled && navigator.platform.toLowerCase().includes("mac");
}

// Fallback component for non-macOS platforms
function FallbackStyledDropdown<T extends string>({
  items,
  selectedItem,
  onChange,
  showButton = true,
}: {
  items: Array<DropdownItem<T>>;
  selectedItem: string;
  onChange: (value: T) => void;
  showButton?: boolean;
}) {
  const select = (
    <div
      className="relative"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {items.find((item) => item.value === selectedItem)!.label}
      <select
        value={selectedItem}
        onChange={(e: TargetedEvent<HTMLSelectElement>) =>
          onChange((e.target as HTMLSelectElement).value as T)
        }
        className="absolute top-0 left-0 right-0 bottom-0 border-none! p-0! m-0! h-auto! w-auto! text-[0px] opacity-0"
      >
        {items.map((item) => (
          <option key={item.value} value={item.value as string}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );

  return !showButton ? (
    select
  ) : (
    <button className="p-1 rounded hover:bg-background-modifier-hover active:bg-background-modifier-active transition-colors w-full justify-start! active:outline-[3px solid var(--color-base-50)]">
      {select}
    </button>
  );
}

// macOS-specific styled dropdown component with CSS anchors
function MacOSStyledDropdown<T>({
  items,
  selectedItem,
  onChange,
  optionHeight = 24,
  showButton = true,
}: {
  items: Array<DropdownItem<T>>;
  selectedItem: string;
  onChange: (value: T) => void;
  optionHeight?: number;
  showButton?: boolean;
}) {
  const {
    isOpen,
    getToggleButtonProps,
    getLabelProps,
    getMenuProps,
    highlightedIndex,
    getItemProps,
  } = useSelect({
    items,
    selectedItem: items.find((item) => item.value === selectedItem)!,
    onSelectedItemChange: ({
      selectedItem: newSelectedItem,
    }: {
      selectedItem: DropdownItem<T> | null;
    }) => newSelectedItem && onChange(newSelectedItem.value),
  });

  const modal = items.map((item, index) => (
    <div
      key={item.value}
      {...getItemProps({ index, item })}
      className={`p-0.75 text-(size:--font-ui-small) flex flex-row items-center pl-5 rounded ${(highlightedIndex == -1 ? items.findIndex((item) => item.value === selectedItem) === index : highlightedIndex === index) ? "bg-(--background-modifier-hover)" : ""} active:bg-(--background-modifier-active-hover)`}
      style={{
        height: optionHeight,
      }}
    >
      <div
        className={`absolute font-bold left-2.5 ${selectedItem === item.value ? "block" : "hidden"}`}
      >
        ✓
      </div>
      {item.label}
    </div>
  ));

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Anchor element for positioning */}
      <div id="dropdown-anchor" className="anchor-relative" />

      <div>
        {!showButton ? (
          <label {...getLabelProps()} {...getToggleButtonProps()}>
            {items.find((item) => item.value === selectedItem)!.label}
          </label>
        ) : (
          <button
            {...getToggleButtonProps()}
            className="p-1 rounded hover:bg-background-modifier-hover active:bg-background-modifier-active transition-colors w-full justify-start!"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            style={{
              outline: isOpen ? "3px solid var(--color-base-50)" : null,
            }}
          >
            <label {...getLabelProps()}>
              {items.find((item) => item.value === selectedItem)!.label}
            </label>
          </button>
        )}
      </div>

      {/* Portal for the dropdown menu */}
      <div
        id="dropdown-portal"
        className="fixed top-0 left-0 w-full h-full pointer-events-none"
      />

      <div
        className="anchor-position:top anchor-reference:anchor(--dropdown-anchor) min-w-full z-50"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transitionProperty: "opacity, top",
          transitionTimingFunction: isOpen ? "none" : "linear, steps(1, end)",
          transitionDuration: isOpen ? "0ms" : "150ms, 0ms",
          transitionDelay: isOpen ? "0ms" : "0ms, 5000ms",
          top:
            -Math.max(
              items.findIndex((item) => item.value === selectedItem),
              0,
            ) *
              optionHeight -
            1,
        }}
      >
        <div
          {...getMenuProps()}
          className={`px-0.5 py-1 w-full bg-(--background-modifier-form-field) border border-(--color-base-40) rounded-lg shadow-lg`}
        >
          {modal}
        </div>
      </div>
    </div>
  );
}

// Main component that chooses the appropriate implementation
export function Dropdown<T extends string>({
  items,
  selectedItem,
  onChange,
  optionHeight,
  showButton = true,
}: {
  items: Array<DropdownItem<T>>;
  selectedItem: string;
  onChange: (value: T) => void;
  optionHeight?: number;
  showButton?: boolean;
}) {
  if (useMacOSCheck()) {
    return (
      <MacOSStyledDropdown
        items={items}
        selectedItem={selectedItem}
        onChange={onChange}
        optionHeight={optionHeight}
        showButton={showButton}
      />
    );
  } else {
    return (
      <FallbackStyledDropdown
        items={items}
        selectedItem={selectedItem}
        onChange={onChange}
        showButton={showButton}
      />
    );
  }
}
