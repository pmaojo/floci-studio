import asyncio
from typing import Dict, Any, List
from floci_backend.config import config
from floci_backend.infrastructure.aws_cli import AwsCli

class Ec2Service:
    def __init__(self, aws_cli: AwsCli):
        self.aws_cli = aws_cli

    async def get_overview(self) -> Dict[str, Any]:
        instances_task = self.aws_cli.run_json(['ec2', 'describe-instances'])
        vpcs_task = self.aws_cli.run_json(['ec2', 'describe-vpcs'])
        security_groups_task = self.aws_cli.run_json(['ec2', 'describe-security-groups'])

        instances_res, vpcs_res, sg_res = await asyncio.gather(
            instances_task, vpcs_task, security_groups_task, return_exceptions=True
        )

        instances = []
        if isinstance(instances_res, dict) and 'Reservations' in instances_res:
            for r in instances_res['Reservations']:
                for inst in r.get('Instances', []):
                    instances.append(inst)

        vpcs = []
        if isinstance(vpcs_res, dict) and 'Vpcs' in vpcs_res:
            vpcs = vpcs_res['Vpcs']

        sgs = []
        if isinstance(sg_res, dict) and 'SecurityGroups' in sg_res:
            sgs = sg_res['SecurityGroups']

        return {
            'endpointUrl': config.aws_endpoint_url,
            'region': config.aws_region,
            'instances': instances,
            'vpcs': vpcs,
            'securityGroups': sgs
        }
