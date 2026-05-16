import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries';
import { adminService } from '@/services/admin/admin-service';

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: adminService.listUsers,
  });
}
