# from unittest.mock import AsyncMock, patch
#
# import pytest
# from jose import jwt
#
# from src.app.core.config import settings
# from src.app.core.security import TokenType, create_token_payload, verify_token
# from src.app.models import UserRole
#
#
# class TestSecurityRoles:
#     def test_create_token_payload_includes_role_email_and_version(self):
#         payload = create_token_payload(
#             {
#                 "username": "workerone",
#                 "email": "worker.one@example.com",
#                 "role_type": UserRole.worker,
#                 "token_version": 3,
#             }
#         )
#         assert payload == {
#             "sub": "workerone",
#             "role": UserRole.worker,
#             "email": "worker.one@example.com",
#             "tv": 3,
#         }
#
#     @pytest.mark.asyncio
#     async def test_verify_token_rejects_role_mismatch(self):
#         token = jwt.encode(
#             {
#                 "sub": "workerone",
#                 "role": UserRole.worker,
#                 "email": "worker.one@example.com",
#                 "tv": 1,
#                 "token_type": TokenType.ACCESS,
#             },
#             settings.SECRET_KEY.get_secret_value(),
#             algorithm=settings.ALGORITHM,
#         )
#
#         with patch("src.app.core.security.crud_token_blacklist.exists", new=AsyncMock(return_value=False)):
#             with patch(
#                     "src.app.core.security.crud_users.get",
#                     new=AsyncMock(
#                         return_value={
#                             "username": "workerone",
#                             "email": "worker.one@example.com",
#                             "role_type": "customer",
#                             "token_version": 1,
#                         }
#                     ),
#             ):
#                 verified = await verify_token(token, TokenType.ACCESS, db=AsyncMock())
#                 assert verified is None
#
#     @pytest.mark.asyncio
#     async def test_verify_token_rejects_token_version_mismatch(self):
#         token = jwt.encode(
#             {
#                 "sub": "workerone",
#                 "role": UserRole.worker,
#                 "email": "worker.one@example.com",
#                 "tv": 1,
#                 "token_type": TokenType.ACCESS,
#             },
#             settings.SECRET_KEY.get_secret_value(),
#             algorithm=settings.ALGORITHM,
#         )
#
#         with patch("src.app.core.security.crud_token_blacklist.exists", new=AsyncMock(return_value=False)):
#             with patch(
#                     "src.app.core.security.crud_users.get",
#                     new=AsyncMock(
#                         return_value={
#                             "username": "workerone",
#                             "email": "worker.one@example.com",
#                             "role_type": UserRole.worker,
#                             "token_version": 2,
#                         }
#                     ),
#             ):
#                 verified = await verify_token(token, TokenType.ACCESS, db=AsyncMock())
#                 assert verified is None
