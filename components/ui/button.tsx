import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useMotionValue, useTransform } from "motion/react";

import { cn } from "./utils";

const buttonVariants = cva(
  "relative overflow-hidden flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background text-foreground dark:bg-input/30 dark:border-input",
        secondary: "bg-secondary text-secondary-foreground",
        ghost: "text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const MotionButton = motion.create("button");

// Extract HTML event handlers that conflict with Motion
type HTMLButtonProps = React.ComponentProps<"button">;
type ConflictingProps =
  | "onDrag"
  | "onDragEnd"
  | "onDragStart"
  | "onAnimationStart";

interface ButtonProps
  extends Omit<HTMLButtonProps, ConflictingProps>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  centerHover?: boolean;
  // Re-add HTML event handlers with correct types
  onDrag?: React.DragEventHandler<HTMLButtonElement>;
  onDragEnd?: React.DragEventHandler<HTMLButtonElement>;
  onDragStart?: React.DragEventHandler<HTMLButtonElement>;
  onAnimationStart?: React.AnimationEventHandler<HTMLButtonElement>;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  centerHover = false,
  onDrag,
  onDragEnd,
  onDragStart,
  onAnimationStart,
  ...props
}: ButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  if (asChild) {
    return (
      <Slot
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        onAnimationStart={onAnimationStart}
        {...props}
      />
    );
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const getHoverScale = () => {
    if (variant === "link") return 1;
    if (centerHover) return 1.1;
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

  const motionVariants = {
    initial: {
      scale: 1,
    },
    hover: {
      scale: getHoverScale(),
    },
  };

  const overlayVariants = {
    initial: {
      scale: 0,
    },
    hover: {
      scale: 2.5,
    },
  };

  const [hoverKey, setHoverKey] = React.useState(0);

  const handleMouseEnterWithKey = (e: React.MouseEvent<HTMLButtonElement>) => {
    handleMouseEnter(e);
    setHoverKey((prev) => prev + 1);
  };

  return (
    <MotionButton
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      variants={motionVariants}
      initial="initial"
      whileHover="hover"
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        mass: 0.5,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnterWithKey}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {variant !== "link" && (
        <motion.div
          key={hoverKey}
          className={cn(
            "absolute rounded-full pointer-events-none w-full h-full blur-xl",
            getOverlayColor()
          )}
          style={{
            left: mouseX,
            top: mouseY,
            x: "-50%",
            y: "-50%",
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={
            isHovered
              ? {
                  scale: 2.5,
                  opacity: 0.7,
                }
              : {
                  scale: 4,
                  opacity: 0,
                }
          }
          transition={
            isHovered
              ? {
                  duration: 0.3,
                  ease: "easeOut",
                }
              : {
                  duration: 0.3,
                  ease: "easeOut",
                }
          }
        />
      )}
      <span className={cn("relative z-10 flex items-center", size !== "icon" && "w-full")}>
        {props.children}
      </span>
    </MotionButton>
  );
}

export { Button, buttonVariants };
