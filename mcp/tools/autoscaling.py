"""Herramientas Auto Scaling: grupos y configuraciones de lanzamiento."""
from tools._client import clean, make_client

def register(mcp):

    @mcp.tool()
    async def list_auto_scaling_groups() -> dict:
        """Lista todos los grupos de Auto Scaling del entorno."""
        r = make_client("autoscaling").describe_auto_scaling_groups()
        return clean({"groups": r.get("AutoScalingGroups", [])})

    @mcp.tool()
    async def list_launch_configurations() -> dict:
        """Lista todas las configuraciones de lanzamiento de Auto Scaling."""
        r = make_client("autoscaling").describe_launch_configurations()
        return clean({"launch_configurations": r.get("LaunchConfigurations", [])})

    @mcp.tool()
    async def create_auto_scaling_group(
        auto_scaling_group_name: str,
        launch_configuration_name: str,
        min_size: int,
        max_size: int,
        desired_capacity: int | None = None,
        vpc_zone_identifier: str | None = None
    ) -> dict:
        """Crea un grupo de Auto Scaling."""
        params = {
            "AutoScalingGroupName": auto_scaling_group_name,
            "LaunchConfigurationName": launch_configuration_name,
            "MinSize": min_size,
            "MaxSize": max_size,
        }
        if desired_capacity is not None:
            params["DesiredCapacity"] = desired_capacity
        if vpc_zone_identifier:
            params["VPCZoneIdentifier"] = vpc_zone_identifier

        make_client("autoscaling").create_auto_scaling_group(**params)
        return {"created": auto_scaling_group_name}

    @mcp.tool()
    async def delete_auto_scaling_group(
        auto_scaling_group_name: str,
        force_delete: bool = False
    ) -> dict:
        """Elimina un grupo de Auto Scaling."""
        make_client("autoscaling").delete_auto_scaling_group(
            AutoScalingGroupName=auto_scaling_group_name,
            ForceDelete=force_delete
        )
        return {"deleted": auto_scaling_group_name}
