from fastcrud import FastCRUD

from ..models.files import File
from ..schemas.file import FileCreate, FileCreateInternal, FileRead, FileUpdate, FileUpdateInternal

CRUDFile = FastCRUD[File, FileCreate, FileUpdateInternal, FileUpdate, FileCreateInternal, FileRead]
crud_files = CRUDFile(File)
