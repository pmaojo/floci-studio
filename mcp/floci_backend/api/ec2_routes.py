from fastapi import APIRouter
from typing import Dict, Any

from floci_backend.application.ec2_service import Ec2Service

def create_ec2_router(ec2_service: Ec2Service) -> APIRouter:
    router = APIRouter()

    @router.get('/ec2/overview')
    async def get_overview() -> Dict[str, Any]:
        return await ec2_service.get_overview()

    return router
