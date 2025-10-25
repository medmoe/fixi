from fastcrud import FastCRUD

from ..models.files import File
from ..schemas.file import FileCreate, FileRead, FileUpdate, FileDelete, FileUpdateInternal, FileCreateInternal

CRUDFile = FastCRUD[File, FileCreateInternal, FileUpdate, FileUpdateInternal, FileDelete, FileRead]
crud_files = CRUDFile(File)
