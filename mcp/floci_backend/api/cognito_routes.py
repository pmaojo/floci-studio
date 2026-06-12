from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from floci_backend.application.cognito_service import CognitoService

def create_cognito_router(cognito_service: CognitoService) -> APIRouter:
    router = APIRouter()

    @router.get('/cognito/pools')
    async def list_user_pools() -> Dict[str, Any]:
        try:
            return await cognito_service.list_user_pools()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get('/cognito/pools/{pool_id}')
    async def describe_user_pool(pool_id: str) -> Dict[str, Any]:
        try:
            return await cognito_service.describe_user_pool(pool_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get('/cognito/pools/{pool_id}/users')
    async def list_users(pool_id: str) -> Dict[str, Any]:
        try:
            return await cognito_service.list_users(pool_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return router
