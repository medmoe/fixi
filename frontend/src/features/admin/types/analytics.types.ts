export interface AnalyticsDateRangeFilters {
    date_from?: string
    date_to?: string
}

export interface DailyMetricPoint {
    date: string
    jobs_posted: number
    applications_submitted: number
    jobs_completed: number
}

export interface PlatformOverviewRead {
    jobs_posted: number
    applications_submitted: number
    applications_accepted: number
    jobs_completed: number
    acceptance_rate: number
    completion_rate: number
    daily: DailyMetricPoint[]
}

export interface TradeCategoryBreakdownItem {
    trade_category_id: number | null
    display_name: string | null
    display_name_ar: string | null
    display_name_fr: string | null
    job_count: number
}

export interface LocationBreakdownItem {
    location: string
    job_count: number
}

export interface PlatformBreakdownRead {
    by_trade_category: TradeCategoryBreakdownItem[]
    by_location: LocationBreakdownItem[]
}

export interface ConversionFunnelRead {
    posted: number
    applied: number
    accepted: number
    completed: number
}
