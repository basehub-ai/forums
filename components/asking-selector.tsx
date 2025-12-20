"use client";

import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Option = {
  id: string;
  name: string;
  image?: string | null;
  isDefault?: boolean;
};

export function AskingSelector({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  const defaultOption = options.find((o) => o.isDefault);
  const selectedOption = value
    ? options.find((o) => o.id === value)
    : defaultOption;

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-sm">Asking:</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="gap-1"
            disabled={disabled}
            size="sm"
            variant="outline"
          >
            {selectedOption?.image ? (
              <img
                alt=""
                className="h-4 w-4 rounded-full"
                height={16}
                src={selectedOption.image}
                width={16}
              />
            ) : null}
            {selectedOption?.name ?? "Select"}
            <ChevronDownIcon className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {options.map((option) => (
            <DropdownMenuItem
              className="gap-2"
              key={option.id}
              onSelect={() => onChange(option.id)}
            >
              {option.image ? (
                <img
                  alt=""
                  className="h-4 w-4 rounded-full"
                  height={16}
                  src={option.image}
                  width={16}
                />
              ) : null}
              {option.name}
              {option.isDefault ? (
                <span className="text-muted-foreground text-xs">(default)</span>
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
