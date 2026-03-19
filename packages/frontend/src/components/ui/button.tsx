import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-10 px-4 py-2",
        icon: "h-9 w-9",
        lg: "h-11 px-5 py-2.5",
        sm: "h-8 px-3 text-xs",
      },
      variant: {
        default: "border-white/10 bg-white/8 text-foreground hover:bg-white/12",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-white/8 hover:text-foreground",
        primary: "border-transparent bg-primary text-primary-foreground hover:opacity-90",
        subtle: "border-border bg-card/70 text-foreground hover:bg-card",
      },
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, size, variant, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ className, size, variant }))} {...props} />;
}
