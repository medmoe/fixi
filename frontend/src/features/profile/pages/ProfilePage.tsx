import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../../../layout/AppLayout';
import { SectionCard } from '../../../components/SectionCard';
import { SectionHeader } from '../../../components/SectionHeader';
import { ActionButton } from '../../../components/ActionButton';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { setUser } from '../../auth/authSlice';
import { useGetMeQuery } from '../../auth/api/authApi';
import {
  useCreateFileMetadataMutation,
  useGetCategoriesQuery,
  useGetProfessionsQuery,
  useGetWorkerMeQuery,
  useUpdateUserMutation,
  useUpdateWorkerProfileMutation,
  useUploadFileContentMutation
} from '../api/profileApi';
import type { UserUpdate, WorkerProfileUpdate } from '../types';

const toList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const ProfilePage = () => {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const { data: meData } = useGetMeQuery();
  const [updateUser, { isLoading: isSavingUser }] = useUpdateUserMutation();
  const [createFileMetadata] = useCreateFileMetadataMutation();
  const [uploadFileContent] = useUploadFileContentMutation();

  const isHandyman = authUser?.role_type === 'handyman';

  const { data: workerData } = useGetWorkerMeQuery(undefined, { skip: !isHandyman });
  const [updateWorkerProfile, { isLoading: isSavingWorker }] = useUpdateWorkerProfileMutation();
  const { data: categories } = useGetCategoriesQuery(undefined, { skip: !isHandyman });
  const { data: professions } = useGetProfessionsQuery(undefined, { skip: !isHandyman });

  const [userForm, setUserForm] = useState<UserUpdate>({});
  const [workerForm, setWorkerForm] = useState<WorkerProfileUpdate>({});
  const [profileUpload, setProfileUpload] = useState<File | null>(null);
  const [portfolioUpload, setPortfolioUpload] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (meData) {
      dispatch(setUser(meData));
      setUserForm({
        name: meData.name,
        username: meData.username,
        email: meData.email,
        bio: meData.bio ?? '',
        location: meData.location ?? '',
        profile_image_url: meData.profile_image_url
      });
    }
  }, [dispatch, meData]);

  useEffect(() => {
    if (workerData) {
      setWorkerForm({
        service_category_id: workerData.service_category_id ?? null,
        profession: workerData.profession,
        hourly_rate: workerData.hourly_rate,
        skills: workerData.skills,
        portfolio_image_urls: workerData.portfolio_image_urls
      });
    }
  }, [workerData]);

  const workerSkills = useMemo(() => workerForm.skills?.join(', ') ?? '', [workerForm.skills]);
  const portfolioUrls = useMemo(
    () => workerForm.portfolio_image_urls?.join(', ') ?? '',
    [workerForm.portfolio_image_urls]
  );
  const isNewWorkerProfile = isHandyman && !workerData;

  const handleUserChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setUserForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleWorkerChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    if (name === 'service_category_id') {
      setWorkerForm((prev) => ({ ...prev, service_category_id: value ? Number(value) : null }));
      return;
    }
    if (name === 'hourly_rate') {
      setWorkerForm((prev) => ({ ...prev, hourly_rate: value ? Number(value) : null }));
      return;
    }
    setWorkerForm((prev) => ({ ...prev, [name]: value } as WorkerProfileUpdate));
  };

  const handleSaveUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authUser) return;

    const payload: UserUpdate = {
      name: userForm.name,
      username: userForm.username,
      email: userForm.email,
      bio: userForm.bio,
      location: userForm.location,
      profile_image_url: userForm.profile_image_url
    };

    await updateUser({ username: authUser.username, payload }).unwrap();
    setMessage('Profile updated.');
  };

  const handleSaveWorker = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: WorkerProfileUpdate = {
      service_category_id: workerForm.service_category_id ? Number(workerForm.service_category_id) : null,
      profession: workerForm.profession ?? null,
      hourly_rate: workerForm.hourly_rate ? Number(workerForm.hourly_rate) : null,
      skills: workerForm.skills ?? [],
      portfolio_image_urls: workerForm.portfolio_image_urls ?? []
    };

    await updateWorkerProfile(payload).unwrap();
    setMessage('Worker profile updated.');
  };

  const uploadAsset = async (file: File) => {
    const metadata = await createFileMetadata({
      original_file_name: file.name,
      mime_type: file.type,
      file_size: file.size
    }).unwrap();

    const uploaded = await uploadFileContent({ fileId: metadata.id, file }).unwrap();
    return uploaded.file_url;
  };

  const handleProfileUpload = async () => {
    if (!profileUpload) return;
    const url = await uploadAsset(profileUpload);
    setUserForm((prev) => ({ ...prev, profile_image_url: url }));
    setProfileUpload(null);
  };

  const handlePortfolioUpload = async () => {
    if (!portfolioUpload) return;
    const url = await uploadAsset(portfolioUpload);
    setWorkerForm((prev) => ({
      ...prev,
      portfolio_image_urls: [...(prev.portfolio_image_urls ?? []), url]
    }));
    setPortfolioUpload(null);
  };

  return (
    <AppLayout>
      <SectionCard>
        <SectionHeader
          label="Profile"
          title="Account details"
          action={
            message ? (
              <span className="rounded-full bg-emerald-100 px-4 py-2 text-xs text-emerald-700">{message}</span>
            ) : null
          }
        />

        <form className="mt-6 grid gap-4 lg:grid-cols-2" onSubmit={handleSaveUser}>
          <label className="text-sm">
            Name
            <input
              name="name"
              value={userForm.name ?? ''}
              onChange={handleUserChange}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
              required
            />
          </label>
          <label className="text-sm">
            Username
            <input
              name="username"
              value={userForm.username ?? ''}
              onChange={handleUserChange}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
              required
            />
          </label>
          <label className="text-sm">
            Email
            <input
              name="email"
              type="email"
              value={userForm.email ?? ''}
              onChange={handleUserChange}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
              required
            />
          </label>
          <label className="text-sm">
            Location
            <input
              name="location"
              value={userForm.location ?? ''}
              onChange={handleUserChange}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
            />
          </label>
          <label className="text-sm lg:col-span-2">
            Bio
            <textarea
              name="bio"
              value={userForm.bio ?? ''}
              onChange={handleUserChange}
              className="mt-2 h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
            />
          </label>
          <div className="lg:col-span-2">
            <p className="text-sm font-semibold">Profile image</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {userForm.profile_image_url && (
                <img
                  src={userForm.profile_image_url}
                  alt="Profile preview"
                  className="h-16 w-16 rounded-full border border-slate-200 object-cover"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setProfileUpload(event.target.files?.[0] ?? null)}
              />
              <ActionButton type="button" onClick={handleProfileUpload} tone="secondary">
                Upload
              </ActionButton>
            </div>
          </div>
          <div className="lg:col-span-2 flex items-center justify-between">
            <ActionButton type="submit" disabled={isSavingUser} tone="primary" size="md">
              {isSavingUser ? 'Saving...' : 'Save profile'}
            </ActionButton>
          </div>
        </form>
      </SectionCard>

      {isHandyman && (
        <SectionCard>
          <SectionHeader label="Handyman profile" title="Service details" />

          <form className="mt-6 grid gap-4 lg:grid-cols-2" onSubmit={handleSaveWorker}>
            <label className="text-sm">
              Service category
              <select
                name="service_category_id"
                value={workerForm.service_category_id ?? ''}
                onChange={handleWorkerChange}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
              >
                <option value="">Select category</option>
                {(categories ?? []).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Profession
              <input
                name="profession"
                list="profession-options"
                value={workerForm.profession ?? ''}
                onChange={handleWorkerChange}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
              />
              <datalist id="profession-options">
                {(professions ?? []).map((profession) => (
                  <option key={profession} value={profession} />
                ))}
              </datalist>
            </label>
            <label className="text-sm">
              Hourly rate
              <input
                name="hourly_rate"
                type="number"
                value={workerForm.hourly_rate ?? ''}
                onChange={handleWorkerChange}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
                required={isNewWorkerProfile}
              />
            </label>
            <label className="text-sm">
              Skills (comma separated)
              <input
                name="skills"
                value={workerSkills}
                onChange={(event) =>
                  setWorkerForm((prev) => ({
                    ...prev,
                    skills: toList(event.target.value)
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
              />
            </label>
            <label className="text-sm lg:col-span-2">
              Portfolio image URLs (comma separated)
              <textarea
                name="portfolio_image_urls"
                value={portfolioUrls}
                onChange={(event) =>
                  setWorkerForm((prev) => ({
                    ...prev,
                    portfolio_image_urls: toList(event.target.value)
                  }))
                }
                className="mt-2 h-20 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
              />
            </label>
            <div className="lg:col-span-2">
              <p className="text-sm font-semibold">Upload portfolio image</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setPortfolioUpload(event.target.files?.[0] ?? null)}
                />
                <ActionButton type="button" onClick={handlePortfolioUpload} tone="secondary">
                  Upload
                </ActionButton>
              </div>
            </div>
            <div className="lg:col-span-2">
              <ActionButton type="submit" disabled={isSavingWorker} tone="primary" size="md">
                {isSavingWorker ? 'Saving...' : 'Save handyman profile'}
              </ActionButton>
            </div>
          </form>
        </SectionCard>
      )}
    </AppLayout>
  );
};
