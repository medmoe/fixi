"""
Seed script: trade_categories table
Populates 10 parent trade categories + sub-trades for each.
Run with: python seed_trade_categories.py

IMPORTANT:
if database is running on a docker container.
run the seed script inside Docker " docker compose exec web python -m src.scripts.seed_trade_category.py
"""
from typing import TypedDict

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.app.core.config import settings
from src.app.core.db.database import Base
from src.app.models import TradeCategory


class SubTradeData(TypedDict):
    name: str
    display_name: str
    display_name_ar: str
    display_name_fr: str
    icon_name: str


class TradeCategoryData(TypedDict):
    name: str
    display_name: str
    display_name_ar: str
    display_name_fr: str
    icon_name: str
    parent_id: None
    sub_trades: list[SubTradeData]

# ────────────────────────────────────────────────────────────────────────────
DATABASE_URI = settings.POSTGRES_URI
DATABASE_PREFIX = settings.POSTGRES_SYNC_PREFIX
DATABASE_URL = f"{DATABASE_PREFIX}{DATABASE_URI}"

# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------
# display_name_ar is standard MSA (Modern Standard Arabic), not Darija --
# per project convention for all UI-facing Arabic content.

TRADE_CATEGORIES: list[TradeCategoryData] = [
    # ── Parent trades ───────────────────────────────────────────────────────
    {
        "name": "electrician",
        "display_name": "Electrician",
        "display_name_ar": "كهربائي",
        "display_name_fr": "Électricien",
        "icon_name": "bolt",
        "parent_id": None,
        "sub_trades": [
            {"name": "residential-electrical", "display_name": "Residential Electrical", "display_name_ar": "كهرباء المنازل", "display_name_fr": "Électricité résidentielle", "icon_name": "bolt"},
            {"name": "commercial-electrical", "display_name": "Commercial Electrical", "display_name_ar": "كهرباء تجارية", "display_name_fr": "Électricité commerciale", "icon_name": "bolt"},
            {"name": "solar-installation", "display_name": "Solar Installation", "display_name_ar": "تركيب الطاقة الشمسية", "display_name_fr": "Installation solaire", "icon_name": "sun"},
        ],
    },
    {
        "name": "plumber",
        "display_name": "Plumber",
        "display_name_ar": "سبّاك",
        "display_name_fr": "Plombier",
        "icon_name": "wrench",
        "parent_id": None,
        "sub_trades": [
            {"name": "pipe-repair", "display_name": "Pipe Repair", "display_name_ar": "إصلاح الأنابيب", "display_name_fr": "Réparation de tuyaux", "icon_name": "wrench"},
            {"name": "drain-cleaning", "display_name": "Drain Cleaning", "display_name_ar": "تسليك المصارف", "display_name_fr": "Débouchage de canalisations", "icon_name": "wrench"},
            {"name": "water-heater", "display_name": "Water Heater", "display_name_ar": "سخانات الماء", "display_name_fr": "Chauffe-eau", "icon_name": "flame"},
        ],
    },
    {
        "name": "carpenter",
        "display_name": "Carpenter",
        "display_name_ar": "نجار",
        "display_name_fr": "Menuisier",
        "icon_name": "hammer",
        "parent_id": None,
        "sub_trades": [
            {"name": "framing", "display_name": "Framing", "display_name_ar": "الهيكلة الخشبية", "display_name_fr": "Charpente", "icon_name": "hammer"},
            {"name": "cabinet-making", "display_name": "Cabinet Making", "display_name_ar": "صناعة الخزائن", "display_name_fr": "Fabrication d'armoires", "icon_name": "hammer"},
            {"name": "decking", "display_name": "Decking", "display_name_ar": "أرضيات خشبية", "display_name_fr": "Terrasses en bois", "icon_name": "hammer"},
        ],
    },
    {
        "name": "hvac",
        "display_name": "HVAC",
        "display_name_ar": "التدفئة والتهوية والتكييف",
        "display_name_fr": "CVC",
        "icon_name": "wind",
        "parent_id": None,
        "sub_trades": [
            {"name": "ac-installation", "display_name": "AC Installation", "display_name_ar": "تركيب المكيفات", "display_name_fr": "Installation de climatisation", "icon_name": "snowflake"},
            {"name": "heating-systems", "display_name": "Heating Systems", "display_name_ar": "أنظمة التدفئة", "display_name_fr": "Systèmes de chauffage", "icon_name": "flame"},
            {"name": "duct-cleaning", "display_name": "Duct Cleaning", "display_name_ar": "تنظيف قنوات التهوية", "display_name_fr": "Nettoyage des conduits", "icon_name": "wind"},
        ],
    },
    {
        "name": "painter",
        "display_name": "Painter",
        "display_name_ar": "دهّان",
        "display_name_fr": "Peintre",
        "icon_name": "paint-roller",
        "parent_id": None,
        "sub_trades": [
            {"name": "interior-painting", "display_name": "Interior Painting", "display_name_ar": "دهان داخلي", "display_name_fr": "Peinture intérieure", "icon_name": "paint-roller"},
            {"name": "exterior-painting", "display_name": "Exterior Painting", "display_name_ar": "دهان خارجي", "display_name_fr": "Peinture extérieure", "icon_name": "paint-roller"},
            {"name": "decorative-finish", "display_name": "Decorative Finish", "display_name_ar": "تشطيب زخرفي", "display_name_fr": "Finition décorative", "icon_name": "palette"},
        ],
    },
    {
        "name": "welder",
        "display_name": "Welder",
        "display_name_ar": "لحّام",
        "display_name_fr": "Soudeur",
        "icon_name": "zap",
        "parent_id": None,
        "sub_trades": [
            {"name": "mig-welding", "display_name": "MIG Welding", "display_name_ar": "لحام MIG", "display_name_fr": "Soudure MIG", "icon_name": "zap"},
            {"name": "tig-welding", "display_name": "TIG Welding", "display_name_ar": "لحام TIG", "display_name_fr": "Soudure TIG", "icon_name": "zap"},
            {"name": "structural-steel", "display_name": "Structural Steel", "display_name_ar": "الهياكل الفولاذية", "display_name_fr": "Charpente métallique", "icon_name": "building"},
        ],
    },
    {
        "name": "roofer",
        "display_name": "Roofer",
        "display_name_ar": "عامل أسطح",
        "display_name_fr": "Couvreur",
        "icon_name": "home",
        "parent_id": None,
        "sub_trades": [
            {"name": "roof-installation", "display_name": "Roof Installation", "display_name_ar": "تركيب الأسطح", "display_name_fr": "Installation de toiture", "icon_name": "home"},
            {"name": "roof-repair", "display_name": "Roof Repair", "display_name_ar": "إصلاح الأسطح", "display_name_fr": "Réparation de toiture", "icon_name": "home"},
            {"name": "gutter-install", "display_name": "Gutter Installation", "display_name_ar": "تركيب المزاريب", "display_name_fr": "Installation de gouttières", "icon_name": "droplets"},
        ],
    },
    {
        "name": "landscaper",
        "display_name": "Landscaper",
        "display_name_ar": "منسّق حدائق",
        "display_name_fr": "Paysagiste",
        "icon_name": "tree",
        "parent_id": None,
        "sub_trades": [
            {"name": "lawn-care", "display_name": "Lawn Care", "display_name_ar": "العناية بالعشب", "display_name_fr": "Entretien des pelouses", "icon_name": "scissors"},
            {"name": "irrigation", "display_name": "Irrigation", "display_name_ar": "الري", "display_name_fr": "Irrigation", "icon_name": "droplets"},
            {"name": "hardscaping", "display_name": "Hardscaping", "display_name_ar": "تبليط وأرضيات صلبة", "display_name_fr": "Maçonnerie paysagère", "icon_name": "layers"},
        ],
    },
    {
        "name": "mason",
        "display_name": "Mason",
        "display_name_ar": "بنّاء",
        "display_name_fr": "Maçon",
        "icon_name": "layers",
        "parent_id": None,
        "sub_trades": [
            {"name": "bricklaying", "display_name": "Bricklaying", "display_name_ar": "بناء بالطوب", "display_name_fr": "Pose de briques", "icon_name": "layers"},
            {"name": "stonework", "display_name": "Stonework", "display_name_ar": "أعمال الحجر", "display_name_fr": "Travaux de pierre", "icon_name": "layers"},
            {"name": "concrete-work", "display_name": "Concrete Work", "display_name_ar": "أعمال الخرسانة", "display_name_fr": "Travaux de béton", "icon_name": "square"},
        ],
    },
    {
        "name": "locksmith",
        "display_name": "Locksmith",
        "display_name_ar": "صانع أقفال",
        "display_name_fr": "Serrurier",
        "icon_name": "key",
        "parent_id": None,
        "sub_trades": [
            {"name": "residential-locks", "display_name": "Residential Locks", "display_name_ar": "أقفال المنازل", "display_name_fr": "Serrures résidentielles", "icon_name": "key"},
            {"name": "commercial-locks", "display_name": "Commercial Locks", "display_name_ar": "أقفال تجارية", "display_name_fr": "Serrures commerciales", "icon_name": "key"},
            {"name": "auto-locksmith", "display_name": "Auto Locksmith", "display_name_ar": "أقفال السيارات", "display_name_fr": "Serrurerie automobile", "icon_name": "car"},
        ],
    },
]


# ---------------------------------------------------------------------------
# Seed function
# ---------------------------------------------------------------------------

def _flat_trades() -> list[tuple[SubTradeData | TradeCategoryData, str | None]]:
    """Flattens TRADE_CATEGORIES into (row, parent_name) pairs, parent_name is
    None for top-level trades -- used by both the insert and backfill paths so
    the two can't drift out of sync with each other."""
    flat: list[tuple[SubTradeData | TradeCategoryData, str | None]] = []
    for trade in TRADE_CATEGORIES:
        flat.append((trade, None))
        for sub in trade["sub_trades"]:
            flat.append((sub, trade["name"]))
    return flat


def seed_trade_categories(session: Session) -> None:
    existing = session.query(TradeCategory).first()
    if existing:
        _backfill_translations(session)
        return

    created_count = 0

    for trade in TRADE_CATEGORIES:
        # Insert parent
        parent = TradeCategory(
            name=trade["name"],
            display_name=trade["display_name"],
            display_name_ar=trade["display_name_ar"],
            display_name_fr=trade["display_name_fr"],
            icon_name=trade["icon_name"],
            parent_id=None,
        )
        session.add(parent)
        session.flush()  # get parent.id before inserting children
        created_count += 1

        # Insert sub-trades
        for sub in trade["sub_trades"]:
            child = TradeCategory(
                name=sub["name"],
                display_name=sub["display_name"],
                display_name_ar=sub["display_name_ar"],
                display_name_fr=sub["display_name_fr"],
                icon_name=sub["icon_name"],
                parent_id=parent.id,
            )
            session.add(child)
            created_count += 1

    session.commit()
    print(f"✅ Seeded {created_count} trade categories successfully.")


def _backfill_translations(session: Session) -> None:
    """Populates display_name_ar/display_name_fr on rows that were seeded
    before those columns existed. Matches by `name` (the immutable slug), so
    it's safe to run repeatedly -- only rows still missing a translation get
    touched."""
    rows_by_name = {row["name"]: row for row, _parent_name in _flat_trades()}

    updated_count = 0
    existing_rows = session.query(TradeCategory).all()
    for db_row in existing_rows:
        seed_row = rows_by_name.get(db_row.name)
        if seed_row is None:
            continue  # a category not in our seed data (manually added) -- leave it alone
        if db_row.display_name_ar is None:
            db_row.display_name_ar = seed_row["display_name_ar"]
            updated_count += 1
        if db_row.display_name_fr is None:
            db_row.display_name_fr = seed_row["display_name_fr"]

    if updated_count:
        session.commit()
        print(f"✅ Backfilled Arabic/French translations for {updated_count} existing trade categories.")
    else:
        print("trade_categories already seeded and translated — skipping.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    engine = create_engine(DATABASE_URL, echo=False)
    Base.metadata.create_all(engine)  # no-op if tables already exist

    with Session(engine) as session:
        seed_trade_categories(session)


if __name__ == "__main__":
    main()
