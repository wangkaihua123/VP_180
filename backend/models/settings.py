"""
设置模型 - 负责设置数据的加载和保存
"""
import json
import os
import logging
from backend.config import SETTINGS_FILE, DEFAULT_SSH_CONFIG, DEFAULT_SERIAL_CONFIG

logger = logging.getLogger(__name__)

class Settings:
    """设置模型类，管理应用设置"""
    
    @staticmethod
    def load():
        """加载设置数据"""
        try:
            if os.path.exists(SETTINGS_FILE):
                with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    if content:
                        return json.loads(content)
            logger.info(f"设置文件不存在或为空，使用默认设置")
            return {
                **DEFAULT_SSH_CONFIG,
                **DEFAULT_SERIAL_CONFIG
            }
        except Exception as e:
            logger.error(f"加载设置数据出错: {e}")
            return {
                **DEFAULT_SSH_CONFIG,
                **DEFAULT_SERIAL_CONFIG
            }
    
    @staticmethod
    def save(settings):
        """保存设置数据"""
        try:
            # 确保目录存在
            os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
            
            # 保存数据
            with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(settings, f, ensure_ascii=False, indent=2)
                
            logger.info(f"成功保存设置到文件")
            return True
        except Exception as e:
            logger.error(f"保存设置数据出错: {e}")
            return False
    
    @staticmethod
    def get_ssh_settings():
        """获取SSH设置"""
        settings = Settings.load()
        ssh_settings = {
            "host": settings.get("sshHost", DEFAULT_SSH_CONFIG["sshHost"]),
            "port": settings.get("sshPort", DEFAULT_SSH_CONFIG["sshPort"]),
            "username": settings.get("sshUsername", DEFAULT_SSH_CONFIG["sshUsername"]),
            "password": settings.get("sshPassword", DEFAULT_SSH_CONFIG["sshPassword"])
        }
        return ssh_settings
    
    @staticmethod
    def update_ssh_settings(ssh_data):
        """更新SSH设置"""
        settings = Settings.load()
        
        # 更新设置
        for key, db_key in {
            "host": "sshHost", 
            "port": "sshPort", 
            "username": "sshUsername", 
            "password": "sshPassword"
        }.items():
            if key in ssh_data and ssh_data[key]:
                settings[db_key] = ssh_data[key]
        
        return Settings.save(settings)
    
    @staticmethod
    def get_serial_settings():
        """获取串口设置"""
        settings = Settings.load()
        serial_settings = {
            "serialPort": settings.get("serialPort", DEFAULT_SERIAL_CONFIG["serialPort"]),
            "serialBaudRate": settings.get("serialBaudRate", DEFAULT_SERIAL_CONFIG["serialBaudRate"])
        }
        return serial_settings
    
    @staticmethod
    def update_serial_settings(serial_data):
        """更新串口设置"""
        settings = Settings.load()
        # 更新设置，只处理串口相关字段，避免覆盖其他设置
        if "serialPort" in serial_data:
            settings["serialPort"] = serial_data["serialPort"]
        if "serialBaudRate" in serial_data:
            settings["serialBaudRate"] = serial_data["serialBaudRate"]
        
        # 确保不会因为前端传入的空数据覆盖SSH设置
        # 移除传入的SSH相关字段，防止它们覆盖已有设置
        for key in ["sshHost", "sshPort", "sshUsername", "sshPassword"]:
            if key in serial_data:
                del serial_data[key]
        
        return Settings.save(settings) 