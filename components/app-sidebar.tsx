"use client"

import { useMemo } from "react"
import {
  LayoutDashboard,
  Store,
  Users,
  Ticket,
  Building2,
  Calculator,
  Ban,
  Tablet,
  FileText,
  Settings,
  ChevronRight,
  ClipboardCheck,
  Shield,
  ShoppingCart,
  Tag,
  UtensilsCrossed,
  Megaphone,
  Percent,
  Gift,
  TrendingUp,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useAdminUser, isSuperAdminRole } from "@/hooks/use-admin-user"

const allMenuItems = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Restaurants",
    icon: Store,
    items: [
      { title: "All Restaurants", url: "/admin/restaurants" },
      { title: "Franchise Management", url: "/admin/franchises", superAdminOnly: true },
      { title: "Onboarding Wizard", url: "/admin/onboarding/new", superAdminOnly: true },
      { title: "Onboarding Status", url: "/admin/onboarding", superAdminOnly: true },
      { title: "Domain Verification", url: "/admin/domains", superAdminOnly: true },
    ],
  },
  {
    title: "Menu Builder",
    icon: UtensilsCrossed,
    items: [
      { title: "Menu Builder", url: "/admin/menu/builder" },
      { title: "Modifier Groups Library", url: "/admin/menu/modifier-groups" },
    ],
  },
  {
    title: "Orders",
    url: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    title: "Devices",
    icon: Tablet,
    superAdminOnly: true,
    items: [
      { title: "All Devices", url: "/admin/devices" },
      { title: "Register Device", url: "/admin/devices/register" },
    ],
  },
  {
    title: "Marketing",
    url: "/admin/promotions",
    icon: Megaphone,
  },
  {
    title: "Users",
    icon: Users,
    superAdminOnly: true,
    items: [
      { title: "Customer Users", url: "/admin/users/customers" },
      { title: "All Admin Users", url: "/admin/users/admin-users" },
      { title: "Add Admin User", url: "/admin/users/admin-users/create" },
      { title: "Roles & Permissions", url: "/admin/users/roles" },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { data: adminUser, isLoading } = useAdminUser()
  
  // Show all items while loading, then filter based on role once we know
  // Default to Super Admin view (show everything) until we confirm otherwise
  const isSuperAdmin = isLoading || !adminUser ? true : isSuperAdminRole(adminUser.role_id)

  const menuItems = useMemo(() => {
    return allMenuItems
      .filter(item => !('superAdminOnly' in item && item.superAdminOnly) || isSuperAdmin)
      .map(item => {
        if (item.items) {
          return {
            ...item,
            items: item.items.filter(subItem => !('superAdminOnly' in subItem && subItem.superAdminOnly) || isSuperAdmin)
          }
        }
        return item
      })
      .filter(item => !item.items || item.items.length > 0)
  }, [isSuperAdmin])

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <Link href="/admin/dashboard" className="flex items-center gap-2" data-testid="link-logo">
          <img 
            src="/menu-ca-logo.png" 
            alt="MENU.CA" 
            className="h-8 w-auto"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.items ? (
                    <Collapsible defaultOpen={item.items.some(sub => pathname.startsWith(sub.url))}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton data-testid={`button-nav-${item.title.toLowerCase()}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton 
                                asChild
                                isActive={pathname === subItem.url}
                                data-testid={`link-${subItem.title.toLowerCase().replace(/ /g, '-')}`}
                              >
                                <Link href={subItem.url}>
                                  {subItem.title}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton 
                      asChild
                      isActive={pathname === item.url}
                      data-testid={`link-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url!}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
