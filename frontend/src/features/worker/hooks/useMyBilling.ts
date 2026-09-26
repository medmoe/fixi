import {useQuery} from "@tanstack/react-query";
import {workerBillingApi} from "@/lib";

export const MY_BILLING_KEY = ["worker-billing", "me"] as const;

export const useMyBilling = () => {
    return useQuery({
        queryKey: MY_BILLING_KEY,
        queryFn: () => workerBillingApi.getMyBilling(),
    });
};
