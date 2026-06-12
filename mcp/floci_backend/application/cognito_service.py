"""Amazon Cognito Identity Explorer (Area 2 — Visual AWS Management).

Provides visual management for Cognito User Pools and Users to help developers
debug authentication flows without the CLI.
"""
from typing import Any, Dict, List, Optional
from floci_backend.infrastructure.boto_factory import make_client

class CognitoService:
    def __init__(self):
        # We instantiate a boto3 client pointing to the local emulator.
        self._client = make_client("cognito-idp")

    async def list_user_pools(self, max_results: int = 60) -> Dict[str, Any]:
        """List Cognito User Pools."""
        pools = []
        try:
            paginator = self._client.get_paginator('list_user_pools')
            for page in paginator.paginate(MaxResults=max_results):
                pools.extend(page.get('UserPools', []))
            return {"pools": pools, "count": len(pools)}
        except Exception as e:
            raise e

    async def describe_user_pool(self, user_pool_id: str) -> Dict[str, Any]:
        """Describe a specific User Pool."""
        try:
            response = self._client.describe_user_pool(UserPoolId=user_pool_id)
            return {"pool": response.get("UserPool", {})}
        except Exception as e:
            raise e

    async def list_users(self, user_pool_id: str) -> Dict[str, Any]:
        """List users in a specific User Pool."""
        users = []
        try:
            paginator = self._client.get_paginator('list_users')
            for page in paginator.paginate(UserPoolId=user_pool_id):
                users.extend(page.get('Users', []))
            return {"users": users, "count": len(users)}
        except Exception as e:
            raise e
