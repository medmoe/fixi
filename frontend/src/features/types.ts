export interface PaginatedListResponse<T> {
    data: T[];
    total_count: number;
    has_more: boolean;
    page: number | null;
    items_per_page: number | null;
}