import * as React from "react";
import { Text, type TextProps, View, type ViewProps } from "react-native";
import { GlassSurface } from "@/components/ui/glass-surface";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/store/theme-store";

export const Card = React.forwardRef<React.ElementRef<typeof View>, ViewProps>(
  ({ className, style, ...props }, ref) => {
    const theme = useResolvedTheme();

    return (
      <GlassSurface
        ref={ref}
        tint="card"
        className={cn("rounded-card border border-card-border p-4 shadow-none", className)}
        style={[{ borderWidth: theme.borderWidth }, style]}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<React.ElementRef<typeof View>, ViewProps>(
  ({ className, ...props }, ref) => (
    <View ref={ref} className={cn("flex-col gap-1 pb-3", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<React.ElementRef<typeof Text>, TextProps>(
  ({ className, ...props }, ref) => (
    <Text
      ref={ref}
      className={cn("font-main-bold text-lg text-text-primary tracking-tight", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<React.ElementRef<typeof Text>, TextProps>(
  ({ className, ...props }, ref) => (
    <Text ref={ref} className={cn("font-ui text-sm text-text-muted", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<React.ElementRef<typeof View>, ViewProps>(
  ({ className, ...props }, ref) => <View ref={ref} className={cn("pt-1", className)} {...props} />,
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<React.ElementRef<typeof View>, ViewProps>(
  ({ className, ...props }, ref) => (
    <View ref={ref} className={cn("flex-row items-center pt-3", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";
