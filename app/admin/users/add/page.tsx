import { redirect } from 'next/navigation'

// Redirect to the new admin creation page
export default function AddAdminUserRedirect() {
  redirect('/admin/users/admin-users/create')
}
