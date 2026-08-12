import {JobCreateRequest, JobRead} from "@/features/job";
import apiClient from "./apiClient";


export const jobApi = {
    createJob: async (payload: JobCreateRequest): Promise<JobRead> => {
        const {data} = await apiClient.post<JobRead>("/jobs", payload);
        return data;
    }
}