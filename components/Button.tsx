"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-spotify-green/80 text-black hover:bg-spotify-green/90 hover:scale-105 shadow-lg shadow-spotify-green/25 backdrop-blur-md border border-spotify-green/30",
  secondary:
    "bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/20",
  ghost: "bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center
          px-8 py-3 rounded-full
          font-semibold text-base
          cursor-pointer
          transition-all duration-200 ease-out
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
