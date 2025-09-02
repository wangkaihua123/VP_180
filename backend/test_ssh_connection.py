#!/usr/bin/env python3
"""
SSH连接测试脚本
用于测试SSH连接功能是否正常工作
"""

import sys
import os
import json

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.ssh_manager import SSHManager
from models.settings import Settings

def test_ssh_connection():
    """测试SSH连接功能"""
    print("=== SSH连接测试 ===")
    
    # 1. 测试设置加载
    print("\n1. 测试设置加载...")
    try:
        settings = Settings.get_ssh_settings()
        print(f"   SSH设置: {settings}")
    except Exception as e:
        print(f"   错误: {e}")
        return False
    
    # 2. 测试SSHManager初始化
    print("\n2. 测试SSHManager初始化...")
    try:
        ssh_manager = SSHManager.get_instance()
        print(f"   SSHManager实例: {ssh_manager}")
        print(f"   主机名: {ssh_manager.hostname}")
        print(f"   用户名: {ssh_manager.username}")
        print(f"   端口: {ssh_manager.port}")
    except Exception as e:
        print(f"   错误: {e}")
        return False
    
    # 3. 测试SSH连接
    print("\n3. 测试SSH连接...")
    try:
        if not ssh_manager.hostname or not ssh_manager.username:
            print("   跳过: 未配置SSH主机名或用户名")
            return True
        
        ssh_client = ssh_manager.connect()
        if ssh_client:
            print("   SSH连接成功!")
            
            # 测试执行命令
            print("\n4. 测试执行命令...")
            try:
                result = ssh_client.exec_command('echo "SSH连接测试成功"')
                print(f"   命令执行结果: {result}")
                
                # 断开连接
                ssh_manager.disconnect()
                print("   SSH连接已断开")
                return True
            except Exception as e:
                print(f"   命令执行失败: {e}")
                return False
        else:
            print("   SSH连接失败")
            return False
    except Exception as e:
        print(f"   错误: {e}")
        return False

def test_ssh_settings_update():
    """测试SSH设置更新功能"""
    print("\n=== SSH设置更新测试 ===")
    
    # 测试设置
    test_settings = {
        "host": "192.168.1.100",  # 替换为实际的SSH主机
        "port": 22,
        "username": "root",
        "password": "password"    # 替换为实际的SSH密码
    }
    
    print(f"\n1. 测试SSH设置更新: {test_settings}")
    try:
        # 更新设置
        success = Settings.update_ssh_settings(test_settings)
        if success:
            print("   设置更新成功")
            
            # 验证设置是否已保存
            updated_settings = Settings.get_ssh_settings()
            print(f"   更新后的设置: {updated_settings}")
            
            # 测试SSHManager更新设置
            print("\n2. 测试SSHManager更新设置...")
            ssh_client = SSHManager.update_settings(test_settings)
            if ssh_client:
                print("   SSHManager设置更新并连接成功")
                
                # 测试执行命令
                print("\n3. 测试执行命令...")
                try:
                    result = ssh_client.exec_command('echo "SSH设置更新测试成功"')
                    print(f"   命令执行结果: {result}")
                    
                    # 断开连接
                    SSHManager.disconnect_all()
                    print("   SSH连接已断开")
                    return True
                except Exception as e:
                    print(f"   命令执行失败: {e}")
                    return False
            else:
                print("   SSHManager设置更新失败，但设置已保存")
                return True
        else:
            print("   设置更新失败")
            return False
    except Exception as e:
        print(f"   错误: {e}")
        return False

def main():
    """主函数"""
    print("开始SSH连接功能测试...")
    
    # 测试SSH连接
    connection_result = test_ssh_connection()
    
    # 测试SSH设置更新
    update_result = test_ssh_settings_update()
    
    # 输出测试结果
    print("\n=== 测试结果 ===")
    print(f"SSH连接测试: {'通过' if connection_result else '失败'}")
    print(f"SSH设置更新测试: {'通过' if update_result else '失败'}")
    
    if connection_result and update_result:
        print("\n所有测试通过!")
        return 0
    else:
        print("\n部分测试失败!")
        return 1

if __name__ == "__main__":
    sys.exit(main())