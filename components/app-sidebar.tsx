"use client"

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
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import menuCaLogo from "@assets/image_1760624954309.png"

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

const menuItems = [
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
      { title: "Add Restaurant", url: "/admin/restaurants/add" },
      { title: "Categories", url: "/admin/restaurants/categories" },
    ],
  },
  {
    title: "Users",
    icon: Users,
    items: [
      { title: "All Users", url: "/admin/users" },
      { title: "Admin Roles", url: "/admin/users/roles" },
      { title: "Permissions", url: "/admin/users/permissions" },
    ],
  },
  {
    title: "Orders",
    url: "/admin/orders",
    icon: FileText,
  },
  {
    title: "Coupons",
    icon: Ticket,
    items: [
      { title: "All Coupons", url: "/admin/coupons" },
      { title: "Create Coupon", url: "/admin/coupons/create" },
      { title: "Campaigns", url: "/admin/coupons/campaigns" },
    ],
  },
  {
    title: "Franchises",
    icon: Building2,
    items: [
      { title: "All Franchises", url: "/admin/franchises" },
      { title: "Commission Rules", url: "/admin/franchises/commission" },
      { title: "Reports", url: "/admin/franchises/reports" },
    ],
  },
  {
    title: "Accounting",
    icon: Calculator,
    items: [
      { title: "Statements", url: "/admin/accounting/statements" },
      { title: "Commissions", url: "/admin/accounting/commissions" },
      { title: "Payments", url: "/admin/accounting/payments" },
      { title: "Reconciliation", url: "/admin/accounting/reconciliation" },
    ],
  },
  {
    title: "Blacklist",
    url: "/admin/blacklist",
    icon: Ban,
  },
  {
    title: "Tablets",
    url: "/admin/tablets",
    icon: Tablet,
  },
  {
    title: "Content",
    icon: Settings,
    items: [
      { title: "Cities", url: "/admin/content/cities" },
      { title: "Cuisines", url: "/admin/content/cuisines" },
      { title: "Email Templates", url: "/admin/content/email-templates" },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <Link href="/admin/dashboard" className="flex items-center gap-2" data-testid="link-logo">
          <Image 
            src={menuCaLogo} 
            alt="Menu.ca Logo" 
            width={120}
            height={24}
            className="h-6 w-auto"
            priority
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
