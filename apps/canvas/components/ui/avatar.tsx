import type * as React from "react";
import { Image, type ImageProps, Text, View, type ViewProps } from "react-native";
import { cn, isTextualChildren } from "@/lib/utils";

export interface AvatarProps extends ViewProps {
  size?: number;
  className?: string;
}

export function Avatar({ className, size = 44, style, ...props }: AvatarProps) {
  return (
    <View
      className={cn(
        "items-center justify-center overflow-hidden rounded-full border border-border bg-card",
        className,
      )}
      style={[{ width: size, height: size }, style]}
      {...props}
    />
  );
}

export interface AvatarImageProps extends ImageProps {
  className?: string;
}

export function AvatarImage({ className, ...props }: AvatarImageProps) {
  return <Image className={cn("h-full w-full object-cover", className)} {...props} />;
}

export interface AvatarFallbackProps extends ViewProps {
  children?: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export function AvatarFallback({
  children,
  className,
  textClassName,
  ...props
}: AvatarFallbackProps) {
  const isTextual = isTextualChildren(children);

  return (
    <View className={cn("h-full w-full items-center justify-center bg-card", className)} {...props}>
      {isTextual ? (
        <Text className={cn("font-ui-bold text-xs text-text-primary", textClassName)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
