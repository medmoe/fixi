from fastcrud import FastCRUD

from ..models.files import File
from ..schemas.file import FileCreate, FileRead, FileUpdate, FileDelete

CRUDFile = FastCRUD[File, FileCreate, FileUpdate, FileUpdate, FileDelete, FileRead]
crud_files = CRUDFile(File)
