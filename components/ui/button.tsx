import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";

import { cn } from "./utils";

const buttonVariants = cva(
  "relative overflow-hidden inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background text-foreground dark:bg-input/30 dark:border-input",
        secondary:
          "bg-secondary text-secondary-foreground",
        ghost:
          "text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const MotionButton = motion.create("button");

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  if (asChild) {
    return (
      <Slot
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }

  const getHoverScale = () => {
    if (variant === "link") return 1;
    if (size === "icon" || size === "sm") return 1.03;
    if (size === "lg") return 1.02;
    return 1.025;
  };

  const getOverlayColor = () => {
    switch (variant) {
      case "default":
        return "bg-primary-foreground/10";
      case "destructive":
        return "bg-white/10";
      case "outline":
        return "bg-accent";
      case "secondary":
        return "bg-secondary-foreground/20";
      case "ghost":
        return "bg-accent";
      default:
        return "";
    }
  };

  return (
    <MotionButton
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      whileHover={{ scale: getHoverScale() }}
      whileTap={{ scale: variant === "link" ? 1 : 0.98 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        mass: 0.5,
      }}
      {...props}
    >
      {variant !== "link" && (
        <motion.div
          className={cn(
            "absolute inset-0 rounded-md",
            getOverlayColor()
          )}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1],
          }}
        />
      )}
      <span className="relative z-10">{props.children}</span>
    </MotionButton>
  );
}

export { Button, buttonVariants };
