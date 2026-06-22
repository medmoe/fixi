"""
Seed script: trade_categories table
Populates 10 parent trade categories + sub-trades for each.
Run with: python seed_trade_categories.py
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.models import TradeCategory
from core.config import settings
from core.db.database import Base

# ────────────────────────────────────────────────────────────────────────────
DATABASE_URI = settings.POSTGRES_URI
DATABASE_PREFIX = settings.POSTGRES_SYNC_PREFIX
DATABASE_URL = f"{DATABASE_PREFIX}{DATABASE_URI}"

# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

TRADE_CATEGORIES = [
    # ── Parent trades ───────────────────────────────────────────────────────
    {
        "name": "electrician",
        "display_name": "Electrician",
        "icon_name": "bolt",
        "parent_id": None,
        "sub_trades": [
            {"name": "residential-electrical", "display_name": "Residential Electrical", "icon_name": "bolt"},
            {"name": "commercial-electrical", "display_name": "Commercial Electrical", "icon_name": "bolt"},
            {"name": "solar-installation", "display_name": "Solar Installation", "icon_name": "sun"},
        ],
    },
    {
        "name": "plumber",
        "display_name": "Plumber",
        "icon_name": "wrench",
        "parent_id": None,
        "sub_trades": [
            {"name": "pipe-repair", "display_name": "Pipe Repair", "icon_name": "wrench"},
            {"name": "drain-cleaning", "display_name": "Drain Cleaning", "icon_name": "wrench"},
            {"name": "water-heater", "display_name": "Water Heater", "icon_name": "flame"},
        ],
    },
    {
        "name": "carpenter",
        "display_name": "Carpenter",
        "icon_name": "hammer",
        "parent_id": None,
        "sub_trades": [
            {"name": "framing", "display_name": "Framing", "icon_name": "hammer"},
            {"name": "cabinet-making", "display_name": "Cabinet Making", "icon_name": "hammer"},
            {"name": "decking", "display_name": "Decking", "icon_name": "hammer"},
        ],
    },
    {
        "name": "hvac",
        "display_name": "HVAC",
        "icon_name": "wind",
        "parent_id": None,
        "sub_trades": [
            {"name": "ac-installation", "display_name": "AC Installation", "icon_name": "snowflake"},
            {"name": "heating-systems", "display_name": "Heating Systems", "icon_name": "flame"},
            {"name": "duct-cleaning", "display_name": "Duct Cleaning", "icon_name": "wind"},
        ],
    },
    {
        "name": "painter",
        "display_name": "Painter",
        "icon_name": "paint-roller",
        "parent_id": None,
        "sub_trades": [
            {"name": "interior-painting", "display_name": "Interior Painting", "icon_name": "paint-roller"},
            {"name": "exterior-painting", "display_name": "Exterior Painting", "icon_name": "paint-roller"},
            {"name": "decorative-finish", "display_name": "Decorative Finish", "icon_name": "palette"},
        ],
    },
    {
        "name": "welder",
        "display_name": "Welder",
        "icon_name": "zap",
        "parent_id": None,
        "sub_trades": [
            {"name": "mig-welding", "display_name": "MIG Welding", "icon_name": "zap"},
            {"name": "tig-welding", "display_name": "TIG Welding", "icon_name": "zap"},
            {"name": "structural-steel", "display_name": "Structural Steel", "icon_name": "building"},
        ],
    },
    {
        "name": "roofer",
        "display_name": "Roofer",
        "icon_name": "home",
        "parent_id": None,
        "sub_trades": [
            {"name": "roof-installation", "display_name": "Roof Installation", "icon_name": "home"},
            {"name": "roof-repair", "display_name": "Roof Repair", "icon_name": "home"},
            {"name": "gutter-install", "display_name": "Gutter Installation", "icon_name": "droplets"},
        ],
    },
    {
        "name": "landscaper",
        "display_name": "Landscaper",
        "icon_name": "tree",
        "parent_id": None,
        "sub_trades": [
            {"name": "lawn-care", "display_name": "Lawn Care", "icon_name": "scissors"},
            {"name": "irrigation", "display_name": "Irrigation", "icon_name": "droplets"},
            {"name": "hardscaping", "display_name": "Hardscaping", "icon_name": "layers"},
        ],
    },
    {
        "name": "mason",
        "display_name": "Mason",
        "icon_name": "layers",
        "parent_id": None,
        "sub_trades": [
            {"name": "bricklaying", "display_name": "Bricklaying", "icon_name": "layers"},
            {"name": "stonework", "display_name": "Stonework", "icon_name": "layers"},
            {"name": "concrete-work", "display_name": "Concrete Work", "icon_name": "square"},
        ],
    },
    {
        "name": "locksmith",
        "display_name": "Locksmith",
        "icon_name": "key",
        "parent_id": None,
        "sub_trades": [
            {"name": "residential-locks", "display_name": "Residential Locks", "icon_name": "key"},
            {"name": "commercial-locks", "display_name": "Commercial Locks", "icon_name": "key"},
            {"name": "auto-locksmith", "display_name": "Auto Locksmith", "icon_name": "car"},
        ],
    },
]


# ---------------------------------------------------------------------------
# Seed function
# ---------------------------------------------------------------------------

def seed_trade_categories(session: Session) -> None:
    # Skip if already seeded
    existing = session.query(TradeCategory).first()
    if existing:
        print("trade_categories already seeded — skipping.")
        return

    created_count = 0

    for trade in TRADE_CATEGORIES:
        # Insert parent
        parent = TradeCategory(
            name=trade["name"],
            display_name=trade["display_name"],
            icon_name=trade["icon_name"],
            parent_id=None,
        )
        session.add(parent)
        session.flush()  # get parent.id before inserting children
        created_count += 1

        # Insert sub-trades
        for sub in trade.get("sub_trades", []):
            child = TradeCategory(
                name=sub["name"],
                display_name=sub["display_name"],
                icon_name=sub["icon_name"],
                parent_id=parent.id,
            )
            session.add(child)
            created_count += 1

    session.commit()
    print(f"✅ Seeded {created_count} trade categories successfully.")


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
