"use client";

import Link from "next/link";
import { LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useThemeChoice } from "@/components/use-theme-choice";
import { readThemeChoice } from "@/lib/theme";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/** The far right of the top bar: the signed-in account's initials, opening Profile, the theme, and Sign out. Sign out
 *  sits here rather than in the bar because it is the least used action on every screen. */
export function AccountMenu({ email }: { email: string }) {
  const [theme, setTheme] = useThemeChoice();
  const signOut = useRef<HTMLFormElement>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Account"
          className="size-8 rounded-full text-xs font-medium data-[state=open]:bg-accent"
        >
          {email.slice(0, 2).toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound strokeWidth={1.8} aria-hidden="true" />
            Profile
          </Link>
        </DropdownMenuItem>
        <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm font-medium">
          <span id="theme-label">Theme</span>
          <ToggleGroup
            type="single"
            size="sm"
            spacing={0}
            value={theme}
            onValueChange={(value) => value && setTheme(readThemeChoice(value))}
            aria-labelledby="theme-label"
          >
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <ToggleGroupItem key={value} value={value} aria-label={label} title={label} className="px-2">
                <Icon strokeWidth={1.8} aria-hidden="true" />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <DropdownMenuSeparator />
        <form ref={signOut} action="/api/auth/signout" method="post">
          <DropdownMenuItem onSelect={() => signOut.current?.requestSubmit()}>
            <LogOut strokeWidth={1.8} aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
