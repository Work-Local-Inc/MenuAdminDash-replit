"use client"

import { User, LogOut, Settings } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useAdminUser } from "@/hooks/use-admin-user"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function UserDropdown() {
  const { user, signOut } = useAuth()
  const { data: adminUser } = useAdminUser()

  const initials = user?.email?.substring(0, 2).toUpperCase() || "AD"
  const profileUrl = adminUser?.id ? `/admin/users/admin-users/${adminUser.id}` : "/admin/profile"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-testid="button-user-menu">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">
              {adminUser?.first_name && adminUser?.last_name 
                ? `${adminUser.first_name} ${adminUser.last_name}` 
                : "Admin User"}
            </p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild data-testid="menu-item-profile">
          <Link href={profileUrl}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild data-testid="menu-item-settings">
          <Link href={profileUrl}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} data-testid="menu-item-logout">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
