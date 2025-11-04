# from unittest.mock import AsyncMock, patch, Mock
#
# import pytest
# from faker import Faker
# from httpx import AsyncClient
#
# from src.app.api.v1.files import write_file, get_user_files
# from src.app.schemas.file import FileCreate, FileRead
#
# fake = Faker()
#
#
# class TestWriteFile:
#     @pytest.mark.asyncio
#     async def test_write_file_success(
#             self,
#             mock_db,
#             sample_file_data,
#             current_user_dict
#     ):
#         file_create = FileCreate(**sample_file_data)
#
#         with patch("src.app.api.v1.files.crud_files") as mock_crud:
#             mock_crud.create_for_user = AsyncMock(
#                 return_value=FileRead(
#                     **{
#                         **sample_file_data,
#                         "id": 1,
#                         "belongs_to_user_id": current_user_dict["id"],
#                         "uploaded_at": fake.date_time().isoformat(),
#                         "public_url": f"https://cdn.example.com/{sample_file_data['file_key']}"
#                     }
#                 )
#             )
#
#             result = await write_file(
#                 request=Mock(),
#                 file=file_create,
#                 current_user=current_user_dict,
#                 db=mock_db
#             )
#
#             assert result.belongs_to_user_id == current_user_dict["id"]
#             mock_crud.create_for_user.assert_awaited_once_with(
#                 user_id=current_user_dict["id"],
#                 file_create=file_create,
#                 db_session=mock_db
#             )
#
#
# class TestReadFiles:
#     """ Test files list endpoint. """
#
#     @pytest.mark.asyncio
#     async def test_read_files_success(self, mock_db, sample_file_data_list, current_user_dict):
#         """ Test successful files list retrieval. """
#         fake_files = [
#             FileRead(**{**data, "id": idx + 1, "belongs_to_user_id": current_user_dict["id"]}) for idx, data in enumerate(sample_file_data_list)
#         ]
#
#         with patch("src.app.api.v1.files.crud_files.get_multi", new=AsyncMock(return_value={
#             "items": fake_files,
#             "total": len(fake_files)
#         })) as mock_get_multi:
#             # Act: call the endpoint
#             response = await get_user_files(
#                 request=Mock(),
#                 db=mock_db,
#                 current_user=current_user_dict,
#                 page=1,
#                 items_per_page=10,
#             )
#
#         # Assertions
#         print(f"FIND ME {response}")
#         assert response.status_code == 200
#         body = response.json()
#         assert "items" in body and "total" in body
#         assert body["total"] == len(fake_files)
#         assert len(body["items"]) == len(fake_files)
#
#         # Check key fields in first item
#         item0 = body["items"][0]
#         assert item0["belongs_to_user_id"] == current_user_dict["id"]
#
#         mock_get_multi.assert_awaited_once_with(
#             db=mock_db,
#             offset=0,
#             limit=10,
#             belongs_to_user_id=current_user_dict["id"],
#             is_deleted=False,
#         )
