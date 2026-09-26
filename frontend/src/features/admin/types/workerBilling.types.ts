export type WorkerBillingDisplayStatus = 'pending' | 'paid' | 'overdue'

export interface WorkerBillingAdminFilters {
    worker_profile_id?: number
    status?: WorkerBillingDisplayStatus
    due_date_from?: string
    due_date_to?: string
}

export interface WorkerBillingAdminRead {
    id: number
    worker_profile_id: number
    worker_name: string
    worker_email: string
    job_id: number
    amount_owed: string
    amount_paid: string
    due_date: string
    status: 'pending' | 'paid' | 'overdue'
    is_overdue: boolean
    payment_id: number | null
    created_at: string
}
