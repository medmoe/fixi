import { useState } from 'react';
import { AppLayout } from '../../../layout/AppLayout';
import { SectionCard } from '../../../components/SectionCard';
import { FilterPanel } from '../../../components/FilterPanel';
import { InsetCard } from '../../../components/InsetCard';
import { SectionHeader } from '../../../components/SectionHeader';
import { ActionButton } from '../../../components/ActionButton';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useGetNearbyJobsQuery } from '../../jobs/api/jobsApi';
import { useGetWorkersQuery, useGetWorkerRatingQuery, useGetWorkerReviewsQuery, useGetNearbyWorkersQuery } from '../api/workersApi';
import { Pagination } from '../../../components/Pagination';

export const WorkersPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const isCustomer = user?.role_type === 'customer';

  const [filters, setFilters] = useState({
    category: '',
    profession: '',
    min_rating: ''
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useGetWorkersQuery(
    {
      page,
      items_per_page: pageSize,
      category: filters.category ? Number(filters.category) : undefined,
      profession: filters.profession || undefined,
      min_rating: filters.min_rating ? Number(filters.min_rating) : undefined
    },
    { skip: !isCustomer }
  );

  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const { data: rating } = useGetWorkerRatingQuery(selectedWorkerId ?? 0, { skip: !selectedWorkerId });
  const { data: reviews } = useGetWorkerReviewsQuery(selectedWorkerId ?? 0, { skip: !selectedWorkerId });

  const [geo, setGeo] = useState({ latitude: '', longitude: '', radius_km: '10' });
  const [geoParams, setGeoParams] = useState<{ latitude: number; longitude: number; radius_km?: number } | null>(null);

  const nearbyWorkers = useGetNearbyWorkersQuery(
    geoParams ?? { latitude: 0, longitude: 0 },
    { skip: !geoParams }
  );
  const nearbyJobs = useGetNearbyJobsQuery(
    geoParams ?? { latitude: 0, longitude: 0 },
    { skip: !geoParams }
  );

  const handleGeoSearch = () => {
    if (!geo.latitude || !geo.longitude) return;
    setGeoParams({
      latitude: Number(geo.latitude),
      longitude: Number(geo.longitude),
      radius_km: geo.radius_km ? Number(geo.radius_km) : undefined
    });
  };

  if (!isCustomer) {
    return (
      <AppLayout>
        <SectionCard>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Workers</p>
          <h1 className="font-display text-3xl text-slate-900">Access limited</h1>
          <p className="mt-3 text-sm text-slate-600">Worker discovery is only available to customers.</p>
        </SectionCard>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SectionCard>
        <SectionHeader label="Workers" title="Find trusted workers" />

        <FilterPanel className="mt-6 md:grid-cols-3">
          <input
            placeholder="Category id"
            value={filters.category}
            onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2"
          />
          <input
            placeholder="Profession"
            value={filters.profession}
            onChange={(event) => setFilters((prev) => ({ ...prev, profession: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2"
          />
          <input
            placeholder="Min rating"
            value={filters.min_rating}
            onChange={(event) => setFilters((prev) => ({ ...prev, min_rating: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2"
          />
        </FilterPanel>

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {isLoading && <p className="text-sm text-slate-500">Loading workers...</p>}
            {(data?.data ?? []).map((worker) => (
              <button
                key={worker.id}
                type="button"
                onClick={() => setSelectedWorkerId(worker.id)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">{worker.profession}</h3>
                  <span className="text-xs text-slate-500">${worker.hourly_rate}/hr</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{worker.bio ?? 'No bio provided.'}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>Skills: {worker.skills.join(', ') || '—'}</span>
                  <span>Rating: {worker.average_rating ?? 'N/A'}</span>
                </div>
              </button>
            ))}
            {!isLoading && (data?.data?.length ?? 0) === 0 && (
              <p className="text-sm text-slate-500">No workers found with these filters.</p>
            )}
            {(data?.total_count ?? 0) > pageSize && (
              <Pagination page={page} total={data?.total_count ?? 0} pageSize={pageSize} onChange={setPage} />
            )}
          </div>

          <InsetCard className="p-5">
            <h2 className="text-sm font-semibold text-slate-700">Selected worker</h2>
            {selectedWorkerId ? (
              <>
                <p className="mt-2 text-xs text-slate-500">Worker #{selectedWorkerId}</p>
                <InsetCard className="mt-4 bg-white">
                  <p className="text-xs text-slate-500">Rating summary</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {rating?.average_rating ?? 'N/A'} ({rating?.total_reviews ?? 0} reviews)
                  </p>
                </InsetCard>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-700">Recent reviews</p>
                  <div className="mt-2 space-y-2 text-xs text-slate-600">
                    {(reviews ?? []).slice(0, 3).map((review) => (
                      <InsetCard key={review.id} className="bg-white p-3 rounded-lg">
                        <p className="font-semibold">Rating {review.rating}</p>
                        <p>{review.comment ?? 'No comment provided.'}</p>
                      </InsetCard>
                    ))}
                    {(reviews ?? []).length === 0 && <p>No reviews available.</p>}
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-3 text-xs text-slate-500">Select a worker to see ratings and reviews.</p>
            )}
          </InsetCard>
        </div>
      </SectionCard>

      <SectionCard className="mt-6">
        <SectionHeader label="Nearby" title="Nearby discovery" />

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <input
            placeholder="Latitude"
            value={geo.latitude}
            onChange={(event) => setGeo((prev) => ({ ...prev, latitude: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
          />
          <input
            placeholder="Longitude"
            value={geo.longitude}
            onChange={(event) => setGeo((prev) => ({ ...prev, longitude: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
          />
          <input
            placeholder="Radius (km)"
            value={geo.radius_km}
            onChange={(event) => setGeo((prev) => ({ ...prev, radius_km: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
          />
          <ActionButton type="button" onClick={handleGeoSearch} tone="primary" size="md">
            Search nearby
          </ActionButton>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <InsetCard>
            <h3 className="text-sm font-semibold text-slate-700">Nearby workers</h3>
            {nearbyWorkers.isFetching && <p className="mt-2 text-xs text-slate-500">Loading...</p>}
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              {(nearbyWorkers.data ?? []).map((worker) => (
                <InsetCard key={worker.user_id} className="bg-white p-3 rounded-lg">
                  <p className="font-semibold">{worker.username}</p>
                  <p>{worker.bio ?? 'No bio provided.'}</p>
                  <p>{worker.distance_km.toFixed(1)} km away</p>
                </InsetCard>
              ))}
              {geoParams && (nearbyWorkers.data ?? []).length === 0 && (
                <p>No nearby workers found.</p>
              )}
            </div>
          </InsetCard>

          <InsetCard>
            <h3 className="text-sm font-semibold text-slate-700">Nearby jobs</h3>
            {nearbyJobs.isFetching && <p className="mt-2 text-xs text-slate-500">Loading...</p>}
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              {(nearbyJobs.data ?? []).map((job) => (
                <InsetCard key={job.job_id} className="bg-white p-3 rounded-lg">
                  <p className="font-semibold">{job.title}</p>
                  <p>{job.description}</p>
                  <p>{job.distance_km.toFixed(1)} km away</p>
                </InsetCard>
              ))}
              {geoParams && (nearbyJobs.data ?? []).length === 0 && (
                <p>No nearby jobs found.</p>
              )}
            </div>
          </InsetCard>
        </div>
      </SectionCard>
    </AppLayout>
  );
};
