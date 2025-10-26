from fastcrud import FastCRUD

from ..models.files import File
from ..schemas.file import FileRead, FileUpdate, FileDelete, FileUpdateInternal, FileCreateInternal, FileCreate, FileReadInternal

CRUDFile = FastCRUD[File, FileCreateInternal, FileUpdate, FileUpdateInternal, FileDelete, FileRead]
crud_files = CRUDFile(File)
