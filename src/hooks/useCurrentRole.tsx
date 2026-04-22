import { useCompany, type CompanyRole } from './useCompany';

export function useCurrentRole(): CompanyRole | null {
  const { role } = useCompany();
  return role;
}
