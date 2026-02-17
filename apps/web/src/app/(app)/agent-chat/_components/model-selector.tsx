'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const models = [
  { value: 'gemini-3-pro', label: 'Gemini 3 Pro', icon: Sparkles },
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash', icon: Zap },
  { value: 'opus-4.6', label: 'Opus 4.6', icon: Zap },
  { value: 'sonnet-4.5', label: 'Sonnet 4.5', icon: Zap },
  { value: 'chatgpt-5.3', label: 'ChatGPT 5.3', icon: Zap },
];

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function ModelSelector({ value, onValueChange }: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const selectedModel = models.find((m) => m.value === value) ?? models[1];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-[200px] justify-between border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
        >
          <div className="flex items-center gap-2">
            <selectedModel.icon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">{selectedModel.label}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[200px] max-h-[280px] overflow-y-auto border-zinc-800 bg-zinc-900"
      >
        {models.map((model) => (
          <DropdownMenuItem
            key={model.value}
            onSelect={() => {
              onValueChange(model.value);
              setOpen(false);
            }}
            className="flex items-center gap-2 cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
          >
            <model.icon className={cn('h-4 w-4 shrink-0', value === model.value ? 'text-primary' : 'text-zinc-500')} />
            <span className="flex-1">{model.label}</span>
            {value === model.value && <Check className="h-4 w-4 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
