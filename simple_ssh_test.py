import paramiko
import socket
import sys
import logging
import time

# 设置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("paramiko")
logger.setLevel(logging.DEBUG)

# 连接配置
HOST = "10.0.18.1"  # 目标SSH服务器
PORT = 22           # SSH端口
USERNAME = "root"   # 用户名
PASSWORD = "123456" # 密码
TIMEOUT = 10        # 超时时间(秒)

def test_ssh_connection():
    """测试SSH连接并提供详细日志"""
    print(f"尝试连接到 {HOST}:{PORT}...")
    
    # 1. 首先测试基础TCP连接
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(TIMEOUT)
        sock.connect((HOST, PORT))
        print(f"TCP连接成功! 等待2秒接收SSH banner...")
        time.sleep(2)
        
        # 尝试读取SSH banner
        try:
            banner = sock.recv(1024)
            print(f"接收到的banner: {banner}")
        except socket.timeout:
            print("读取banner超时")
        except Exception as e:
            print(f"读取banner错误: {e}")
        
        sock.close()
    except Exception as e:
        print(f"TCP连接失败: {e}")
        return
    
    # 2. 尝试使用更高级别的Paramiko连接
    print("\n尝试使用Paramiko建立SSH连接...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        # 设置明确的超时
        client.connect(
            hostname=HOST,
            port=PORT,
            username=USERNAME,
            password=PASSWORD,
            timeout=TIMEOUT,
            allow_agent=False,
            look_for_keys=False,
            banner_timeout=15  # 增加banner超时
        )
        print("SSH连接成功!")
        
        # 测试执行命令
        stdin, stdout, stderr = client.exec_command("echo 'Connection test successful'")
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        print(f"命令输出: {out}")
        if err:
            print(f"命令错误: {err}")
            
        client.close()
        return True
    except socket.timeout:
        print("SSH连接超时")
    except paramiko.AuthenticationException:
        print("认证失败: 用户名或密码错误")
    except paramiko.SSHException as e:
        print(f"SSH异常: {e}")
    except Exception as e:
        print(f"发生未知错误: {e}")
    
    return False

if __name__ == "__main__":
    print(f"Python版本: {sys.version}")
    print(f"Paramiko版本: {paramiko.__version__}")
    print("-" * 50)
    
    result = test_ssh_connection()
    
    if result:
        print("\n连接测试成功!")
    else:
        print("\n连接测试失败!") 