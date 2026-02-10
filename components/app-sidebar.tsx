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
  MapPin,
  Rocket,
  Wrench,
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
import { useRestaurants } from "@/lib/hooks/use-restaurants"

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
      { title: "Domain Verification", url: "/admin/domains", superAdminOnly: true },
    ],
  },
  {
    title: "Onboarding",
    icon: Rocket,
    superAdminOnly: true,
    items: [
      { title: "Wizard", url: "/admin/onboarding/new" },
      { title: "Tools", url: "/admin/onboarding/tools" },
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
      { title: "Fallback Calls", url: "/admin/devices/fallback-calls" },
    ],
  },
  {
    title: "Marketing",
    url: "/admin/promotions",
    icon: Megaphone,
  },
  {
    title: "Accounting",
    icon: Calculator,
    superAdminOnly: true,
    subgroups: [
      {
        label: "Billing",
        items: [
          { title: "Restaurant Statements", url: "/admin/accounting/statements" },
          { title: "Batch Statements", url: "/admin/accounting/batch-statements" },
          { title: "Weekly Commission", url: "/admin/accounting/commission" },
          { title: "Adjustments", url: "/admin/accounting/adjustments" },
        ],
      },
      {
        label: "Transactions",
        items: [
          { title: "Daily Orders", url: "/admin/accounting/orders" },
          { title: "Refunds", url: "/admin/accounting/refunds" },
        ],
      },
      {
        label: "Vendors",
        items: [
          { title: "Commissions", url: "/admin/accounting/vendor-commissions" },
          { title: "Invoices", url: "/admin/accounting/vendor-invoices" },
        ],
      },
    ],
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

interface AppSidebarProps {
  className?: string
}

export function AppSidebar({ className }: AppSidebarProps = {}) {
  const pathname = usePathname()
  const { data: adminUser, isLoading: isLoadingUser } = useAdminUser()
  const { data: restaurants = [], isLoading: isLoadingRestaurants } = useRestaurants()
  
  // Hide super admin items while loading or if not confirmed as Super Admin
  // Only show admin-only items once we CONFIRM user is Super Admin (role_id = 1)
  const isSuperAdmin = !isLoadingUser && adminUser ? isSuperAdminRole(adminUser.role_id) : false

  const menuItems = useMemo(() => {
    return allMenuItems
      .filter(item => !('superAdminOnly' in item && item.superAdminOnly) || isSuperAdmin)
      .map(item => {
        if (item.title === "Restaurants" && !isSuperAdmin && 'items' in item && item.items) {
          return {
            ...item,
            items: [{ title: "All Restaurants", url: "/admin/restaurants" }]
          }
        }
        
        if ('items' in item && item.items) {
          return {
            ...item,
            items: item.items.filter((subItem: any) => !('superAdminOnly' in subItem && subItem.superAdminOnly) || isSuperAdmin)
          }
        }
        return item
      })
      .filter(item => {
        if ('items' in item) return !item.items || (item.items as any[]).length > 0
        return true
      })
  }, [isSuperAdmin, restaurants])

  return (
    <Sidebar className={className}>
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
              {menuItems.map((item: any) => (
                <SidebarMenuItem key={item.title}>
                  {item.subgroups ? (
                    <Collapsible 
                      className="group/collapsible"
                      defaultOpen={item.subgroups.some((sg: any) => 
                        sg.items.some((sub: any) => pathname.startsWith(sub.url))
                      )}
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton data-testid={`button-nav-${item.title.toLowerCase()}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subgroups.map((sg: any) => (
                            <div key={sg.label}>
                              <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                                {sg.label}
                              </p>
                              {sg.items.map((subItem: any) => (
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
                            </div>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : item.items ? (
                    <Collapsible 
                      className="group/collapsible"
                      defaultOpen={item.items.some((sub: { url: string }) => pathname.startsWith(sub.url))}
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton data-testid={`button-nav-${item.title.toLowerCase()}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem: { title: string; url: string }) => (
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
