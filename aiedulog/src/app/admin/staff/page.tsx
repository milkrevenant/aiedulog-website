import AuthGuard from '@/components/AuthGuard'
import { StaffManagementClient } from './StaffManagementClient'

export default function AdminStaffPage() {
  return (
    <AuthGuard requireAuth requireAdmin>
      <StaffManagementClient />
    </AuthGuard>
  )
}
