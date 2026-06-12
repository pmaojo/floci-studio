import pytest
from floci_backend.application.cognito_service import CognitoService

@pytest.fixture
def cognito_service():
    return CognitoService()

@pytest.mark.asyncio
async def test_list_user_pools(cognito_service):
    # Depending on if localstack is running or not, this will either
    # succeed or raise an EndpointConnectionError.
    try:
        result = await cognito_service.list_user_pools()
        assert 'pools' in result
        assert 'count' in result
        assert isinstance(result['pools'], list)
        assert isinstance(result['count'], int)
    except Exception as e:
        # If localstack isn't running, an exception is expected
        assert 'EndpointConnectionError' in str(type(e)) or 'ConnectTimeoutError' in str(type(e)) or 'Max retries exceeded' in str(e)

@pytest.mark.asyncio
async def test_describe_user_pool_not_found(cognito_service):
    # This should fail and raise an exception because pool does not exist
    with pytest.raises(Exception):
        await cognito_service.describe_user_pool('us-east-1_notfound')

@pytest.mark.asyncio
async def test_list_users_not_found(cognito_service):
    # This should fail because the pool does not exist
    with pytest.raises(Exception):
        await cognito_service.list_users('us-east-1_notfound')
