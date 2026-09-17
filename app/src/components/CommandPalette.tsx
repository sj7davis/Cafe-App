import { useEffect } from 'react';
import type { SidebarNavGroup } from './layout/SidebarNav';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from './ui/command';

interface CommandPaletteProps {
  groups: SidebarNavGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
}

/** Cmd/Ctrl+K palette for jumping straight to any dashboard tab. */
export function CommandPalette({ groups, open, onOpenChange, onSelect }: CommandPaletteProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Jump to" description="Search for a page in your dashboard">
      <CommandInput placeholder="Jump to a page…" />
      <CommandList>
        <CommandEmpty>No matching page.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.group} heading={group.group}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  value={`${group.group} ${item.label}`}
                  onSelect={() => { onSelect(item.id); onOpenChange(false); }}
                >
                  <Icon />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
