import { useAppSelector } from '../../../hooks/useAppSelector';
import { AppLayout } from '../../../layout/AppLayout';
import { SectionCard } from '../../../components/SectionCard';
import { SectionHeader } from '../../../components/SectionHeader';

export const DashboardPage = () => {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <AppLayout>
      <SectionCard>
        <SectionHeader
          label="Dashboard"
          title={user?.role_type === 'handyman' ? 'Handyman Control Center' : 'Customer Job Hub'}
        />
        <p className="mt-4 text-sm text-slate-600">
          Welcome back, {user?.name}. Your role is <span className="font-semibold">{user?.role_type}</span>. We’ll
          surface jobs, profiles, and nearby tasks here as we build out the next feature set.
        </p>
      </SectionCard>
    </AppLayout>
  );
};
