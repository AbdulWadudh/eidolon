import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react-native";
import type { SvgProps } from "react-native-svg";

export interface AppIconProps extends Omit<SvgProps, "color" | "strokeWidth"> {
  icon: IconSvgElement;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export function AppIcon({
  icon,
  size = 20,
  color = "#FFFFFF",
  strokeWidth,
  className,
  ...props
}: AppIconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}
