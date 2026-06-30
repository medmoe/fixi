from fastcrud import FastCRUD

from ..models.files import File
from ..schemas.file import FileBase, FileCreate, FileDelete, FileRead, FileUpdate, FileUpdateInternal

CRUDFile = FastCRUD[File, FileCreate | FileBase, FileUpdate, FileUpdateInternal, FileDelete, FileRead]
crud_files = CRUDFile(File)
