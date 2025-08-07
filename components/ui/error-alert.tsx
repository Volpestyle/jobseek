import * as React from "react";
import { Alert, AlertDescription } from "./alert";
import { AlertCircle } from "lucide-react";
import { Button } from "./button";

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorAlert({ message, onRetry, className }: ErrorAlertProps) {
  return (
    <Alert
      variant="destructive"
      className={`border-red-500 ${className || ""}`}
    >
      <AlertDescription className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
          <span className="text-base text-white">{message}</span>
        </div>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="w-fit ml-6"
          >
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
