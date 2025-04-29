"""
启动脚本 - 从项目根目录运行应用
"""
import os
import sys

# 添加项目根目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# 导入并运行应用
from backend.app import app

if __name__ == '__main__':
    # 从backend.config模块导入配置
    from backend.config import HOST, PORT, DEBUG
    # 启动应用
    app.run(host=HOST, debug=DEBUG, port=PORT) 