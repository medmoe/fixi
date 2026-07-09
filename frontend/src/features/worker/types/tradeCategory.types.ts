export type TradeCategory = {
    name: string
    display_name: string
    icon_name: string
    parent_id: number | null
    id: number
    created_at: string
    children: TradeCategory[]
}