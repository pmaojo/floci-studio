"""Herramientas Cognito: user pools."""
from tools._client import make_client

def register(mcp):

    @mcp.tool()
    async def cognito_list_user_pools() -> str:
        """
        Lista todos los User Pools de Cognito (hasta 50).
        Retorna un string con formato JSON de los pools encontrados.
        """
        client = make_client('cognito-idp')
        try:
            response = client.list_user_pools(MaxResults=50)
            pools = response.get('UserPools', [])
            return str(pools)
        except Exception as e:
            return f"Error al listar User Pools: {str(e)}"

    @mcp.tool()
    async def cognito_create_user_pool(pool_name: str) -> str:
        """
        Crea un nuevo User Pool en Cognito.

        Args:
            pool_name: Nombre del nuevo pool de usuarios.
        """
        client = make_client('cognito-idp')
        try:
            response = client.create_user_pool(PoolName=pool_name)
            return f"User pool '{pool_name}' creado satisfactoriamente: {response['UserPool']['Id']}"
        except Exception as e:
            return f"Error al crear User Pool: {str(e)}"
