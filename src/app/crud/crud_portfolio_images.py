from fastcrud import FastCRUD

from ..models import PortfolioImage
from ..schemas.portfolio_image import PortfolioImageCreate, PortfolioImageDelete, PortfolioImageInternalUpdate, PortfolioImageRead, PortfolioImageUpdate


class CRUDPortfolioImage(FastCRUD[
    PortfolioImage,
    PortfolioImageCreate,
    PortfolioImageUpdate,
    PortfolioImageInternalUpdate,
    PortfolioImageDelete,
    PortfolioImageRead,
]):
    pass


crud_portfolio_images = CRUDPortfolioImage(PortfolioImage)
