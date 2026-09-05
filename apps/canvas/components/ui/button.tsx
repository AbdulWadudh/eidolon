import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Pressable, type PressableProps, Text } from "react-native";
import { cn, isTextualChildren } from "@/lib/utils";

const buttonVariants = cva(
  "flex-row items-center justify-center rounded-button active:opacity-85",
  {
    variants: {
      variant: {
        default: "bg-primary",
        secondary: "bg-secondary border border-border",
        destructive: "bg-danger",
        ghost: "bg-transparent",
      },
      size: {
        default: "h-11 px-4 py-2.5",
        sm: "h-9 px-3 py-1.5",
        lg: "h-12 px-6 py-3",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const buttonTextVariants = cva("font-ui-medium text-center", {
  variants: {
    variant: {
      default: "text-primary-foreground font-semibold",
      secondary: "text-secondary-foreground font-medium",
      destructive: "text-text-primary font-semibold",
      ghost: "text-text-primary",
    },
    size: {
      default: "text-sm",
      sm: "text-xs",
      lg: "text-base",
      icon: "text-base",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface ButtonProps extends PressableProps, VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  ({ className, textClassName, variant, size, children, ...props }, ref) => {
    const isTextual = isTextualChildren(children);

    return (
      <Pressable ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props}>
        {isTextual ? (
          <Text className={cn(buttonTextVariants({ variant, size, className: textClassName }))}>
            {children}
          </Text>
        ) : (
          children
        )}
      </Pressable>
    );
  },
);

Button.displayName = "Button";
