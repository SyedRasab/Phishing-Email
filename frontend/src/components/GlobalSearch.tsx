import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Mail, LayoutDashboard, ShieldCheck, FileSearch, Settings, Users, AlertTriangle } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative hidden max-w-md flex-1 items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-white/[0.05] hover:text-foreground hover:border-primary/50 md:flex w-64"
      >
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
          <span>Search emails, domains, settings...</span>
        </div>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/dashboard" }))}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/inbox" }))}>
              <Mail className="mr-2 h-4 w-4" />
              <span>SOC Inbox</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/analyzer" }))}>
              <FileSearch className="mr-2 h-4 w-4" />
              <span>Threat Analyzer</span>
            </CommandItem>
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Administration">
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/rules" }))}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              <span>Sender Rules</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/admin/employees" }))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Employees Directory</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/settings" }))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>
          
          <CommandSeparator />

          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/inbox" }))}>
              <AlertTriangle className="mr-2 h-4 w-4 text-phishing" />
              <span className="text-phishing">Review Quarantined Emails</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
