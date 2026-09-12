import { type ClassValue, clsx } from "clsx";
import { isNotNil, isNumber, isString } from "es-toolkit";
import React from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function isTextualChildren(children: React.ReactNode): boolean {
  return (
    isNotNil(children) && React.Children.toArray(children).every((c) => isString(c) || isNumber(c))
  );
}
