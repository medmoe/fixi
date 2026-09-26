import {JobCreateRequest, JobFilters, JobRead, JobUpdateRequest, JobApplicationCreate, JobApplicationRead, JobApplicationUpdate, JobApplicationWithdrawRequest} from "@/features/job";
import {PaginatedListResponse} from "@/features/types";
import type {WorkerProfileWithTradesRead} from "@/features/worker";
import apiClient from "./apiClient";

export const jobApi = {
    createJob: async (payload: JobCreateRequest): Promise<JobRead> => {
        const {data} = await apiClient.post<JobRead>("/jobs", payload);
        return data;
    },
    updateJob: async (id: number, payload: JobUpdateRequest): Promise<JobRead> => {
        const {data} = await apiClient.patch<JobRead>(`/jobs/${id}`, payload);
        return data;
    },
    getJob: async (id: number): Promise<JobRead> => {
        const {data} = await apiClient.get<JobRead>(`/jobs/${id}`);
        return data;
    },
    getMyJobs: async (): Promise<PaginatedListResponse<JobRead>> => {
        const {data} = await apiClient.get<PaginatedListResponse<JobRead>>("/jobs/my");
        return data;
    },
    deleteJob: async (id: number): Promise<void> => {
        await apiClient.delete(`/jobs/${id}`);
    },
    getJobs: async (filters: JobFilters, offset: number, limit: number): Promise<PaginatedListResponse<JobRead>> => {
        const params = {...filters, offset, limit}
        const {data} = await apiClient.get<PaginatedListResponse<JobRead>>("/jobs", {params});
        return data
    },
    applyToJob: async(jobId: number, payload: JobApplicationCreate): Promise<JobApplicationRead> => {
        const {data} = await apiClient.post<JobApplicationRead>(`/jobs/${jobId}/apply`, payload);
        return data
    },
    getJobApplications: async (jobId: number, page: number = 1, pageSize: number = 50): Promise<PaginatedListResponse<JobApplicationRead>> => {
        const {data} = await apiClient.get<PaginatedListResponse<JobApplicationRead>>(`/jobs/${jobId}/applications`, {
            params: { page, page_size: pageSize }
        });
        return data;
    },
    updateJobApplication: async (jobId: number, appId: number, payload: JobApplicationUpdate): Promise<JobApplicationRead> => {
        const {data} = await apiClient.patch<JobApplicationRead>(`/jobs/${jobId}/applications/${appId}`, payload);
        return data;
    },
    getMyApplication: async (jobId: number): Promise<JobApplicationRead | null> => {
        const {data} = await apiClient.get<JobApplicationRead | null>(`/jobs/${jobId}/my-application`);
        return data;
    },
    confirmApplication: async (jobId: number, appId: number): Promise<JobApplicationRead> => {
        const {data} = await apiClient.post<JobApplicationRead>(`/jobs/${jobId}/applications/${appId}/confirm`);
        return data;
    },
    withdrawApplication: async (jobId: number, appId: number, payload: JobApplicationWithdrawRequest): Promise<JobApplicationRead> => {
        const {data} = await apiClient.post<JobApplicationRead>(`/jobs/${jobId}/applications/${appId}/withdraw`, payload);
        return data;
    },
    startJob: async (jobId: number): Promise<JobRead> => {
        const {data} = await apiClient.post<JobRead>(`/jobs/${jobId}/start`);
        return data;
    },
    completeJob: async (jobId: number): Promise<JobRead> => {
        const {data} = await apiClient.post<JobRead>(`/jobs/${jobId}/complete`);
        return data;
    },
    getNearbyWorkers: async (jobId: number, offset: number, limit: number): Promise<PaginatedListResponse<WorkerProfileWithTradesRead>> => {
        const {data} = await apiClient.get<PaginatedListResponse<WorkerProfileWithTradesRead>>(`/jobs/${jobId}/nearby-workers`, {params: {offset, limit}});
        return data;
    },
}