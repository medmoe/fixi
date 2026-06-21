import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '../../../layout/AppLayout';
import { SectionCard } from '../../../components/SectionCard';
import { useAppSelector } from '../../../hooks/useAppSelector';
import {
  useAcceptJobMutation,
  useAssignJobMutation,
  useCompleteJobMutation,
  useGetJobQuery,
  useUpdateJobStatusMutation
} from '../api/jobsApi';
import type { JobStatus } from '../types';
import { ReviewPanel } from '../components/ReviewPanel';
import { SectionHeader } from '../../../components/SectionHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { ActionButton } from '../../../components/ActionButton';
import { useGetWorkersQuery } from '../../workers/api/workersApi';

export const JobDetailPage = () => {
  const { jobId } = useParams();
  const user = useAppSelector((state) => state.auth.user);
  const isCustomer = user?.role_type === 'customer';

  const parsedId = Number(jobId);
  const { data: job, isLoading } = useGetJobQuery(parsedId, { skip: Number.isNaN(parsedId) });
  const [assignJob] = useAssignJobMutation();
  const [updateJobStatus] = useUpdateJobStatusMutation();
  const [acceptJob] = useAcceptJobMutation();
  const [completeJob] = useCompleteJobMutation();
  const [assignWorkerId, setAssignWorkerId] = useState('');
  const { data: workers } = useGetWorkersQuery({ page: 1, items_per_page: 20 }, { skip: !isCustomer });

  const handleStatusChange = async (status: JobStatus) => {
    if (!job) return;
    await updateJobStatus({ jobId: job.id, payload: { status } }).unwrap();
  };

  if (Number.isNaN(parsedId)) {
    return (
      <AppLayout>
        <SectionCard>
          <p className="text-sm text-slate-600">Invalid job id.</p>
        </SectionCard>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SectionCard>
        <SectionHeader
          label="Job details"
          title={`Job #${job?.id ?? parsedId}`}
          action={
            <Link to="/jobs" className="text-xs font-semibold text-slate-600 underline">
              Back to jobs
            </Link>
          }
        />

        {isLoading && <p className="mt-6 text-sm text-slate-500">Loading job...</p>}
        {!isLoading && !job && <p className="mt-6 text-sm text-slate-500">Job not found.</p>}

        {job && (
          <div className="mt-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{job.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{job.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
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
              <span>Customer: {job.customer_id}</span>
              <span>Worker: {job.worker_id ?? 'unassigned'}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {isCustomer && job.status === 'open' && (
                <ActionButton
                  type="button"
                  onClick={() => handleStatusChange('cancelled')}
                  tone="danger"
                >
                  Cancel job
                </ActionButton>
              )}
              {isCustomer && job.status === 'open' && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={assignWorkerId}
                    onChange={(event) => setAssignWorkerId(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
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
                    onClick={() =>
                      assignJob({ jobId: job.id, payload: { worker_id: Number(assignWorkerId || 0) } })
                    }
                    disabled={!Number(assignWorkerId)}
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
                  onClick={() => handleStatusChange('in_progress')}
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
        )}
      </SectionCard>
    </AppLayout>
  );
};
