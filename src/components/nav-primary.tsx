'use client'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '#/components/ui/sidebar'
import type { Item } from '#/lib/types'
import { Link } from '@tanstack/react-router'

interface NavPrimaryProps {
  items: Item[]
}

export const NavPrimary: React.FC<NavPrimaryProps> = ({ items }) => {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild size="sm">
                <Link
                  activeProps={{ 'data-active': 'true' }}
                  activeOptions={item.activeOptions}
                  to={item.to}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
