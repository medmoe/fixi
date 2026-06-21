import { apiSlice } from '../../../app/apiSlice';
import type {
  FileCreate,
  FileRead,
  FileUploadResponse,
  ServiceCategoryRead,
  UserUpdate,
  WorkerProfileUpdate,
  WorkerRead
} from '../types';

export const profileApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    updateUser: builder.mutation<{ message: string }, { username: string; payload: UserUpdate }>({
      query: ({ username, payload }) => ({
        url: `/user/${username}`,
        method: 'PATCH',
        body: payload
      }),
      invalidatesTags: ['User']
    }),
    getWorkerMe: builder.query<WorkerRead, void>({
      query: () => ({
        url: '/worker/me'
      })
    }),
    updateWorkerProfile: builder.mutation<WorkerRead, WorkerProfileUpdate>({
      query: (payload) => ({
        url: '/worker/profile',
        method: 'PUT',
        body: payload
      })
    }),
    getCategories: builder.query<ServiceCategoryRead[], void>({
      query: () => ({
        url: '/categories'
      })
    }),
    getProfessions: builder.query<string[], void>({
      query: () => ({
        url: '/professions'
      })
    }),
    createFileMetadata: builder.mutation<FileRead, FileCreate>({
      query: (payload) => ({
        url: '/files',
        method: 'POST',
        body: payload
      })
    }),
    uploadFileContent: builder.mutation<FileUploadResponse, { fileId: number; file: File }>({
      query: ({ fileId, file }) => {
        const formData = new FormData();
        formData.append('upload_file', file);
        return {
          url: `/files/${fileId}`,
          method: 'POST',
          body: formData
        };
      }
    })
  })
});

export const {
  useUpdateUserMutation,
  useGetWorkerMeQuery,
  useUpdateWorkerProfileMutation,
  useGetCategoriesQuery,
  useGetProfessionsQuery,
  useCreateFileMetadataMutation,
  useUploadFileContentMutation
} = profileApi;
