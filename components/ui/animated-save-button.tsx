"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star } from "lucide-react";
import { Button } from "./button";
import { cn } from "./utils";

interface AnimatedSaveButtonProps {
  isSaved: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "destructive"
    | "link";
}

export function AnimatedSaveButton({
  isSaved,
  onClick,
  disabled = false,
  className,
  size = "sm",
  variant,
}: AnimatedSaveButtonProps) {
  const [hasInteracted, setHasInteracted] = React.useState(false);

  const handleClick = () => {
    setHasInteracted(true);
    onClick();
  };

  return (
    <Button
      variant={isSaved ? "default" : "outline"}
      size={size}
      onClick={handleClick}
      disabled={disabled}
      className={cn("relative overflow-hidden", className)}
    >
      <div className="flex items-center relative">
        <motion.div
          initial={false}
          animate={{
            rotate: isSaved ? 215 : 0,
            x: isSaved ? 0 : 3,
          }}
          transition={
            hasInteracted
              ? {
                  duration: 0.4,
                  ease: "easeInOut",
                }
              : {
                  duration: 0,
                }
          }
          className="mr-2 relative"
        >
          <Star className="h-4 w-4 fill-transparent" />
          <motion.div
            className="absolute inset-0"
            initial={false}
            animate={{
              opacity: isSaved ? 1 : 0,
            }}
            transition={
              hasInteracted
                ? {
                    duration: 0.3,
                    ease: "easeInOut",
                  }
                : {
                    duration: 0,
                  }
            }
          >
            <Star className="h-4 w-4 fill-current" />
          </motion.div>
        </motion.div>
        <AnimatePresence mode="wait" initial={false}>
          {isSaved ? (
            <motion.span
              key="saved"
              initial={{ opacity: 0, x: -2 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 2 }}
              transition={{
                duration: 0.1,
                ease: "easeInOut",
              }}
            >
              Saved
            </motion.span>
          ) : (
            <motion.span
              key="save"
              initial={{ opacity: 0, x: -2 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 2 }}
              transition={{
                duration: 0.1,
                ease: "easeInOut",
              }}
            >
              Save
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </Button>
  );
}
