import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/items')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
