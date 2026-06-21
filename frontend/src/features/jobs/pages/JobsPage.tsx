import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../../../layout/AppLayout';
import { SectionCard } from '../../../components/SectionCard';
import { FilterPanel } from '../../../components/FilterPanel';
import { InsetCard } from '../../../components/InsetCard';
import { SectionHeader } from '../../../components/SectionHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { ActionButton } from '../../../components/ActionButton';
import { useAppSelector } from '../../../hooks/useAppSelector';
import {
  useAcceptJobMutation,
  useAssignJobMutation,
  useCompleteJobMutation,
  useCreateJobMutation,
  useGetMyJobsQuery,
  useGetNearbyJobsQuery,
  useUpdateJobStatusMutation
} from '../api/jobsApi';
import type { JobStatus } from '../types';
import { ReviewPanel } from '../components/ReviewPanel';
import { useGetCategoriesQuery } from '../../profile/api/profileApi';
import { useGetWorkersQuery } from '../../workers/api/workersApi';
import { Pagination } from '../../../components/Pagination';

export const JobsPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const isCustomer = user?.role_type === 'customer';

  const { data: jobs = [], isLoading } = useGetMyJobsQuery();
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [createJob, { isLoading: isCreating }] = useCreateJobMutation();
  const [assignJob] = useAssignJobMutation();
  const [updateJobStatus] = useUpdateJobStatusMutation();
  const [acceptJob] = useAcceptJobMutation();
  const [completeJob] = useCompleteJobMutation();

  const { data: categories } = useGetCategoriesQuery(undefined, { skip: !isCustomer });
  const { data: workers } = useGetWorkersQuery({ page: 1, items_per_page: 20 }, { skip: !isCustomer });

  const [formState, setFormState] = useState({
    title: '',
    description: '',
    service_category_id: '',
    worker_id: ''
  });

  const sortedJobs = useMemo(() => [...jobs].sort((a, b) => b.id - a.id), [jobs]);
  const pagedJobs = useMemo(() => sortedJobs.slice((page - 1) * pageSize, page * pageSize), [sortedJobs, page, pageSize]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createJob({
      title: formState.title,
      description: formState.description,
      service_category_id: formState.service_category_id ? Number(formState.service_category_id) : null,
      worker_id: formState.worker_id ? Number(formState.worker_id) : null
    }).unwrap();
    setFormState({ title: '', description: '', service_category_id: '', worker_id: '' });
  };

  const [assignSelections, setAssignSelections] = useState<Record<number, string>>({});

  const handleAssign = async (jobId: number, workerId: number) => {
    if (!workerId) return;
    await assignJob({ jobId, payload: { worker_id: workerId } }).unwrap();
  };

  const handleStatusChange = async (jobId: number, status: JobStatus) => {
    await updateJobStatus({ jobId, payload: { status } }).unwrap();
  };

  const [nearbyForm, setNearbyForm] = useState({ latitude: '', longitude: '', radius_km: '10' });
  const [nearbyParams, setNearbyParams] = useState<
    { latitude: number; longitude: number; radius_km?: number; status?: string } | null
  >(null);

  const nearbyJobs = useGetNearbyJobsQuery(nearbyParams ?? { latitude: 0, longitude: 0 }, { skip: !nearbyParams });

  const handleNearbySearch = () => {
    if (!nearbyForm.latitude || !nearbyForm.longitude) return;
    setNearbyParams({
      latitude: Number(nearbyForm.latitude),
      longitude: Number(nearbyForm.longitude),
      radius_km: nearbyForm.radius_km ? Number(nearbyForm.radius_km) : undefined,
      status: 'open'
    });
  };

  return (
    <AppLayout>
      <SectionCard>
        <SectionHeader
          label="Jobs"
          title="My jobs"
          action={<StatusBadge label={`${jobs.length} jobs`} tone="neutral" className="px-4 py-2" />}
        />

        {isCustomer && (
          <FilterPanel className="mt-6" as="form" onSubmit={handleSubmit}>
            <h2 className="font-semibold text-slate-900">Create a job</h2>
            <input
              value={formState.title}
              onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Job title"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2"
              required
            />
            <textarea
              value={formState.description}
              onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Describe the job"
              className="h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-2"
              required
            />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs text-slate-600">
                Service category
                <select
                  value={formState.service_category_id}
                  onChange={(event) => setFormState((prev) => ({ ...prev, service_category_id: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2"
                >
                  <option value="">Select category</option>
                  {(categories ?? []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-600">
                Assign worker
                <select
                  value={formState.worker_id}
                  onChange={(event) => setFormState((prev) => ({ ...prev, worker_id: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2"
                >
                  <option value="">Unassigned</option>
                  {(workers?.data ?? []).map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      #{worker.id} {worker.profession}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <ActionButton type="submit" disabled={isCreating} tone="primary" size="md" className="w-full">
              {isCreating ? 'Creating...' : 'Create job'}
            </ActionButton>
          </FilterPanel>
        )}

        <div className="mt-6 space-y-4">
          {isLoading && <p className="text-sm text-slate-500">Loading jobs...</p>}
          {!isLoading && sortedJobs.length === 0 && <p className="text-sm text-slate-500">No jobs yet.</p>}
          {pagedJobs.map((job) => (
            <div key={job.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link to={`/jobs/${job.id}`} className="text-lg font-semibold text-slate-900 underline">
                    {job.title}
                  </Link>
                  <p className="text-sm text-slate-600">{job.description}</p>
                </div>
                <StatusBadge
                  label={job.status.replace('_', ' ')}
                  tone={
                    job.status === 'open'
                      ? 'info'
                      : job.status === 'assigned'
                      ? 'warning'
                      : job.status === 'in_progress'
                      ? 'neutral'
                      : job.status === 'completed'
                      ? 'success'
                      : 'danger'
                  }
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>Job #{job.id}</span>
                <span>Customer {job.customer_id}</span>
                <span>Worker {job.worker_id ?? 'unassigned'}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {isCustomer && job.status === 'open' && (
                  <ActionButton
                    type="button"
                    onClick={() => handleStatusChange(job.id, 'cancelled')}
                    tone="danger"
                  >
                    Cancel
                  </ActionButton>
                )}
                {isCustomer && job.status === 'open' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={assignSelections[job.id] ?? ''}
                      onChange={(event) =>
                        setAssignSelections((prev) => ({ ...prev, [job.id]: event.target.value }))
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                    >
                      <option value="">Select worker</option>
                      {(workers?.data ?? []).map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          #{worker.id} {worker.profession}
                        </option>
                      ))}
                    </select>
                    <ActionButton
                      type="button"
                      onClick={() => handleAssign(job.id, Number(assignSelections[job.id] || 0))}
                      disabled={!Number(assignSelections[job.id])}
                      tone="secondary"
                    >
                      Assign worker
                    </ActionButton>
                  </div>
                )}
                {!isCustomer && job.status === 'open' && (
                  <ActionButton
                    type="button"
                    onClick={() => acceptJob(job.id)}
                    tone="secondary"
                  >
                    Accept job
                  </ActionButton>
                )}
                {!isCustomer && job.status === 'assigned' && job.worker_id === user?.id && (
                  <ActionButton
                    type="button"
                    onClick={() => handleStatusChange(job.id, 'in_progress')}
                    tone="secondary"
                  >
                    Mark in progress
                  </ActionButton>
                )}
                {!isCustomer && job.status === 'in_progress' && job.worker_id === user?.id && (
                  <ActionButton
                    type="button"
                    onClick={() => completeJob(job.id)}
                    tone="secondary"
                  >
                    Mark complete
                  </ActionButton>
                )}
              </div>
              {isCustomer && job.status === 'completed' && <ReviewPanel jobId={job.id} />}
            </div>
          ))}
          {sortedJobs.length > pageSize && (
            <Pagination page={page} total={sortedJobs.length} pageSize={pageSize} onChange={setPage} />
          )}
        </div>
      </SectionCard>

      {!isCustomer && (
        <SectionCard className="mt-6">
          <SectionHeader label="Nearby" title="Nearby open jobs" />

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <input
              placeholder="Latitude"
              value={nearbyForm.latitude}
              onChange={(event) => setNearbyForm((prev) => ({ ...prev, latitude: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
            />
            <input
              placeholder="Longitude"
              value={nearbyForm.longitude}
              onChange={(event) => setNearbyForm((prev) => ({ ...prev, longitude: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
            />
            <input
              placeholder="Radius (km)"
              value={nearbyForm.radius_km}
              onChange={(event) => setNearbyForm((prev) => ({ ...prev, radius_km: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
            />
            <ActionButton type="button" onClick={handleNearbySearch} tone="primary" size="md">
              Search nearby
            </ActionButton>
          </div>

          <div className="mt-6 space-y-3 text-sm text-slate-600">
            {nearbyJobs.isFetching && <p>Loading nearby jobs...</p>}
            {(nearbyJobs.data ?? []).map((job) => (
              <InsetCard key={job.job_id}>
                <p className="font-semibold text-slate-800">{job.title}</p>
                <p>{job.description}</p>
                <p className="text-xs text-slate-500">{job.distance_km.toFixed(1)} km away</p>
              </InsetCard>
            ))}
            {nearbyParams && (nearbyJobs.data ?? []).length === 0 && <p>No nearby jobs found.</p>}
          </div>
        </SectionCard>
      )}
    </AppLayout>
  );
};
