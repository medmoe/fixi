import {useMutation, useQueryClient} from "@tanstack/react-query";
import {jobApi} from "@/lib";
import {JobApplicationRead, JobApplicationUpdate} from "@/features/job";
import {PaginatedListResponse} from "@/features/types";

type Variables = {jobId: number; appId: number; payload: JobApplicationUpdate};
type MutateContext = {previousData: PaginatedListResponse<JobApplicationRead> | undefined};

export const useUpdateJobApplication = () => {
    const queryClient = useQueryClient();

    return useMutation<JobApplicationRead, Error, Variables, MutateContext>({
        mutationFn: ({jobId, appId, payload}) => jobApi.updateJobApplication(jobId, appId, payload),
        // Fires synchronously before the network request — updates the cache immediately
        // so the panel reflects the new status the instant the confirm dialog closes.
        onMutate: ({jobId, appId, payload}) => {
            const previousData = queryClient.getQueryData<PaginatedListResponse<JobApplicationRead>>(
                ["job-applications", jobId]
            );
            queryClient.setQueryData<PaginatedListResponse<JobApplicationRead>>(
                ["job-applications", jobId],
                (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        data: old.data.map(app =>
                            app.id === appId ? {...app, status: payload.status} : app
                        ),
                    };
                }
            );
            return {previousData};
        },
        onError: (_err, {jobId}, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(["job-applications", jobId], context.previousData);
            }
        },
        onSuccess: (updatedApplication, {jobId, appId}) => {
            // Replace the optimistic entry with the authoritative server response.
            // Do NOT call invalidateQueries for ["job-applications"] here — the
            // background GET it triggers can race the PATCH and return stale data
            // (e.g. if the backend has a short-lived cache), which would overwrite
            // the correct data we just received and revert the UI to the old status.
            queryClient.setQueryData<PaginatedListResponse<JobApplicationRead>>(
                ["job-applications", jobId],
                (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        data: old.data.map(app =>
                            app.id === appId ? updatedApplication : app
                        ),
                    };
                }
            );
            queryClient.invalidateQueries({queryKey: ["jobs"]});
        },
    });
};