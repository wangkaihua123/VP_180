import pytest
from vp_180.utils.ssh_manager import SSHManager

@pytest.fixture(scope="session")
def ssh_connection():
    """获取全局SSH连接"""
    ssh_client = SSHManager.get_client()
    if not ssh_client:
        raise RuntimeError("无法获取SSH连接")
    return ssh_client

@pytest.fixture
def test_power_cycle(ssh_connection):
    """创建 Test_PowerCycle 实例"""
    from vp_180.tests.Test_PowerCycle import Test_PowerCycle
    return Test_PowerCycle(ssh_connection) 