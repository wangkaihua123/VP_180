"""
认证服务 - 处理用户登录和登出
"""
import logging

logger = logging.getLogger(__name__)

class AuthService:
    """认证服务类，处理用户登录和登出"""
    
    @staticmethod
    def login(username, password):
        """用户登录验证"""
        # 简单的验证逻辑，实际应用中应使用数据库和加密验证
        if username == 'admin' and password == 'admin':
            logger.info(f"用户 {username} 登录成功")
            return {
                'success': True,
                'message': '登录成功',
                'user': {
                    'username': username
                }
            }
        else:
            logger.warning(f"用户 {username} 登录失败: 用户名或密码错误")
            return {
                'success': False,
                'message': '用户名或密码错误'
            }
    
    @staticmethod
    def logout(username):
        """用户登出"""
        logger.info(f"用户 {username} 登出成功")
        return {
            'success': True,
            'message': '已成功退出'
        } 