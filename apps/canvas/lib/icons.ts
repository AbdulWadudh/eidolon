/**
 * Per-icon re-exports.
 *
 * `@hugeicons/core-free-icons` resolves its barrel entry to `dist/cjs/index.js`,
 * which re-exports all 6031 icons. Metro does not tree-shake, so importing from
 * the barrel shipped every one of them in the Hermes bundle regardless of how
 * few were referenced. The package exposes a `./*` subpath export, so each icon
 * is pulled in individually here and every call site imports from this module.
 *
 * Adding an icon: add a line below, then import it from "@/lib/icons".
 * Never import from "@hugeicons/core-free-icons" directly.
 */
export { default as ArrowDown01Icon } from "@hugeicons/core-free-icons/ArrowDown01Icon";
export { default as ArrowLeft01Icon } from "@hugeicons/core-free-icons/ArrowLeft01Icon";
export { default as ArrowReloadHorizontalIcon } from "@hugeicons/core-free-icons/ArrowReloadHorizontalIcon";
export { default as ArrowUp01Icon } from "@hugeicons/core-free-icons/ArrowUp01Icon";
export { default as Call02Icon } from "@hugeicons/core-free-icons/Call02Icon";
export { default as Cancel01Icon } from "@hugeicons/core-free-icons/Cancel01Icon";
export { default as CheckmarkCircle01Icon } from "@hugeicons/core-free-icons/CheckmarkCircle01Icon";
export { default as ColorPickerIcon } from "@hugeicons/core-free-icons/ColorPickerIcon";
export { default as Logout01Icon } from "@hugeicons/core-free-icons/Logout01Icon";
export { default as Moon02Icon } from "@hugeicons/core-free-icons/Moon02Icon";
export { default as PaintBoardIcon } from "@hugeicons/core-free-icons/PaintBoardIcon";
export { default as QrCodeIcon } from "@hugeicons/core-free-icons/QrCodeIcon";
export { default as Settings01Icon } from "@hugeicons/core-free-icons/Settings01Icon";
export { default as SparklesIcon } from "@hugeicons/core-free-icons/SparklesIcon";
export { default as Sun02Icon } from "@hugeicons/core-free-icons/Sun02Icon";
