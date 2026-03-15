import type { ProfileView } from '@/types/user';

export function mapProfileToView(raw: Record<string, unknown>): ProfileView {
  const base = raw.user as Record<string, unknown> | undefined;
  const source = base && typeof base === 'object' ? base : raw;
  return {
    name: String(source?.name ?? source?.firstName ?? ''),
    email: String(source?.email ?? ''),
    phone: String(source?.phone ?? source?.phoneNumber ?? ''),
    photoUrl: typeof source?.photoUrl === 'string' ? source.photoUrl : typeof source?.avatarUrl === 'string' ? source.avatarUrl : null,
  };
}
