export type SkillLevel = 'junior' | 'mid' | 'senior'

export interface TradeCategoryRead {
    id: number
    name: string | null
    display_name: string | null
    // Optional (unlike the other nullable fields above) so the many existing
    // test fixtures across the app don't all need updating just to satisfy
    // the type -- the backend always sends both, this only matters for
    // older/incomplete mock objects.
    display_name_ar?: string | null
    display_name_fr?: string | null
    icon_name: string | null
    parent_id: number | null
    created_at: string | null
}

export interface TradeCategoryWithChildren extends TradeCategoryRead{
    children: TradeCategoryWithChildren[]
}

export interface WorkerTradeNestedRead {
    id: number
    worker_profile_id: number
    trade_category_id: number
    skill_level: SkillLevel
    trade_category: TradeCategoryRead | null
}