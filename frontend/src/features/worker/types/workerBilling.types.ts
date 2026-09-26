export type WorkerBillingStatus = "pending" | "paid" | "overdue";

/** GET /worker-billing/me -- a worker's own commission record. Decimals arrive as strings. */
export interface WorkerBillingRead {
    id: number;
    worker_profile_id: number;
    job_id: number;
    amount_owed: string;
    amount_paid: string;
    due_date: string;
    status: WorkerBillingStatus;
    is_overdue: boolean;
    payment_id: number | null;
    invoice_key: string | null;
    created_at: string;
    updated_at: string | null;
}
