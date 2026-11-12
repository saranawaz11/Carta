import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from core import config

_bearer = HTTPBearer(auto_error=False)
_jwks_client: PyJWKClient | None = None


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(f"{config.CLERK_ISSUER}/.well-known/jwks.json")
    return _jwks_client


def verify_clerk_token(token: str) -> str:
    if not token or not config.CLERK_ISSUER:
        raise _unauthorized()
    try:
        key = _get_jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            key.key,
            algorithms=["RS256"],
            issuer=config.CLERK_ISSUER,
            options={"require": ["exp", "iss", "sub"]},
        )
    except jwt.PyJWTError:
        raise _unauthorized()
    azp = claims.get("azp")
    if azp and azp not in config.CLERK_AUTHORIZED_PARTIES:
        raise _unauthorized()
    return claims["sub"]


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if credentials is None:
        raise _unauthorized()
    return verify_clerk_token(credentials.credentials)
