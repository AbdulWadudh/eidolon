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
export { default as AddCircleIcon } from "@hugeicons/core-free-icons/AddCircleIcon";
export { default as ArrowDown01Icon } from "@hugeicons/core-free-icons/ArrowDown01Icon";
export { default as ArrowLeft01Icon } from "@hugeicons/core-free-icons/ArrowLeft01Icon";
export { default as ArrowReloadHorizontalIcon } from "@hugeicons/core-free-icons/ArrowReloadHorizontalIcon";
export { default as ArrowRight01Icon } from "@hugeicons/core-free-icons/ArrowRight01Icon";
export { default as ArrowUp01Icon } from "@hugeicons/core-free-icons/ArrowUp01Icon";
export { default as Book02Icon } from "@hugeicons/core-free-icons/Book02Icon";
export { default as BookOpen01Icon } from "@hugeicons/core-free-icons/BookOpen01Icon";
export { default as Call02Icon } from "@hugeicons/core-free-icons/Call02Icon";
export { default as CallEnd01Icon } from "@hugeicons/core-free-icons/CallEnd01Icon";
export { default as Cancel01Icon } from "@hugeicons/core-free-icons/Cancel01Icon";
export { default as CheckmarkCircle01Icon } from "@hugeicons/core-free-icons/CheckmarkCircle01Icon";
export { default as ColorPickerIcon } from "@hugeicons/core-free-icons/ColorPickerIcon";
export { default as Download01Icon } from "@hugeicons/core-free-icons/Download01Icon";
export { default as FileUploadIcon } from "@hugeicons/core-free-icons/FileUploadIcon";
export { default as FlashIcon } from "@hugeicons/core-free-icons/FlashIcon";
export { default as Globe02Icon } from "@hugeicons/core-free-icons/Globe02Icon";
export { default as HandIcon } from "@hugeicons/core-free-icons/HandIcon";
export { default as Image01Icon } from "@hugeicons/core-free-icons/Image01Icon";
export { default as Logout01Icon } from "@hugeicons/core-free-icons/Logout01Icon";
export { default as MagicWand01Icon } from "@hugeicons/core-free-icons/MagicWand01Icon";
export { default as Mic01Icon } from "@hugeicons/core-free-icons/Mic01Icon";
export { default as MicOff01Icon } from "@hugeicons/core-free-icons/MicOff01Icon";
export { default as Moon02Icon } from "@hugeicons/core-free-icons/Moon02Icon";
export { default as MoreVerticalIcon } from "@hugeicons/core-free-icons/MoreVerticalIcon";
export { default as PaintBoardIcon } from "@hugeicons/core-free-icons/PaintBoardIcon";
export { default as PauseIcon } from "@hugeicons/core-free-icons/PauseIcon";
export { default as PlayIcon } from "@hugeicons/core-free-icons/PlayIcon";
export { default as QrCodeIcon } from "@hugeicons/core-free-icons/QrCodeIcon";
export { default as RefreshIcon } from "@hugeicons/core-free-icons/RefreshIcon";
export { default as Search01Icon } from "@hugeicons/core-free-icons/Search01Icon";
export { default as SentIcon } from "@hugeicons/core-free-icons/SentIcon";
export { default as Settings01Icon } from "@hugeicons/core-free-icons/Settings01Icon";
export { default as SmileIcon } from "@hugeicons/core-free-icons/SmileIcon";
export { default as SparklesIcon } from "@hugeicons/core-free-icons/SparklesIcon";
export { default as SquareLock01Icon } from "@hugeicons/core-free-icons/SquareLock01Icon";
export { default as SquareUnlock01Icon } from "@hugeicons/core-free-icons/SquareUnlock01Icon";
export { default as Sun02Icon } from "@hugeicons/core-free-icons/Sun02Icon";
export { default as Undo02Icon } from "@hugeicons/core-free-icons/Undo02Icon";
export { default as VolumeHighIcon } from "@hugeicons/core-free-icons/VolumeHighIcon";
export { default as VolumeOffIcon } from "@hugeicons/core-free-icons/VolumeOffIcon";
