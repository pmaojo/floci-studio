import pytest
from unittest.mock import AsyncMock, MagicMock
from floci_backend.application.ec2_service import Ec2Service
from floci_backend.infrastructure.aws_cli import AwsCli

@pytest.mark.asyncio
async def test_get_overview_success():
    aws_cli_mock = AsyncMock(spec=AwsCli)

    # Mock CLI responses for EC2 commands
    aws_cli_mock.run_json.side_effect = [
        {"Reservations": [{"Instances": [{"InstanceId": "i-123", "State": {"Name": "running"}}]}]},
        {"Vpcs": [{"VpcId": "vpc-456", "CidrBlock": "10.0.0.0/16"}]},
        {"SecurityGroups": [{"GroupId": "sg-789", "GroupName": "default"}]}
    ]

    service = Ec2Service(aws_cli_mock)
    overview = await service.get_overview()

    assert overview is not None
    assert "endpointUrl" in overview
    assert "region" in overview

    assert len(overview["instances"]) == 1
    assert overview["instances"][0]["InstanceId"] == "i-123"

    assert len(overview["vpcs"]) == 1
    assert overview["vpcs"][0]["VpcId"] == "vpc-456"

    assert len(overview["securityGroups"]) == 1
    assert overview["securityGroups"][0]["GroupId"] == "sg-789"

    assert aws_cli_mock.run_json.call_count == 3
