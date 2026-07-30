export type SkillLevel = 'junior' | 'mid' | 'senior'

export interface TradeCategoryRead {
    id: number
    name: string | null
    display_name: string | null
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