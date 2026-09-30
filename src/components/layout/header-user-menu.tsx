"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/custom/user-avatar";
import { LogOut, User } from "lucide-react";

type Props = {
  displayName: string;
  displayEmail: string;
  avatarInitials: string;
  onSignOut: () => void;
  /** Show only the avatar (no name) — e.g. a collapsed sidebar rail. */
  compact?: boolean;
  /** When set, adds a "Profile" item linking to the user's own account page. */
  profileHref?: string;
};

export function HeaderUserMenu({
  displayName,
  displayEmail,
  avatarInitials,
  onSignOut,
  compact = false,
  profileHref,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={compact ? "size-9 justify-center p-0" : "w-full min-w-0 justify-start gap-2"}
          aria-label={compact ? displayName : undefined}
        >
          <UserAvatar initials={avatarInitials} size="sm" />
          {!compact && (
            <span className="min-w-0 flex-1 truncate text-left">{displayName}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="break-words">{displayName}</div>
          {displayEmail ? (
            <div className="break-all text-xs font-normal text-muted-foreground">{displayEmail}</div>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profileHref ? (
          <DropdownMenuItem asChild>
            <Link href={profileHref}>
              <User className="h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            void onSignOut();
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
