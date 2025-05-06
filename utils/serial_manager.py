import serial
import time
from .log_config import setup_logger

logger = setup_logger(__name__)

class SerialManager:
    _instance = None
    _serial = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, serialPort=None, serialBaudRate=None, timeout=1):
        logger.debug(f"SerialManager初始化参数: serialPort={serialPort}, serialBaudRate={serialBaudRate}, timeout={timeout}")
        
        # 验证参数
        if not serialPort:
            logger.error("serialPort参数为空")
            raise ValueError("serialPort不能为空！")
        if not serialBaudRate:
            logger.error("serialBaudRate参数为空")
            raise ValueError("serialBaudRate不能为空！")
            
        # 确保参数类型正确
        try:
            self.port = str(serialPort).strip()
            self.baudrate = int(serialBaudRate)
            self.timeout = int(timeout) if timeout else 1
        except (ValueError, TypeError) as e:
            logger.error(f"参数类型转换失败: {e}")
            raise ValueError(f"参数类型错误: {e}")
            
        # 记录初始化状态
        logger.info(f"串口管理器初始化: port={self.port}, baudrate={self.baudrate}, timeout={self.timeout}")
        self.initialized = True

    @classmethod
    def get_instance(cls, serialPort=None, serialBaudRate=None, timeout=1):
        if cls._instance is None:
            logger.debug("创建新的SerialManager实例")
            cls._instance = SerialManager(serialPort, serialBaudRate, timeout)
        elif serialPort is not None and serialBaudRate is not None:
            logger.debug("更新现有SerialManager实例参数")
            cls._instance.port = str(serialPort).strip()
            cls._instance.baudrate = int(serialBaudRate)
            cls._instance.timeout = int(timeout) if timeout else 1
        return cls._instance

    @classmethod
    def get_client(cls):
        """获取已存在的串口连接或创建新的"""
        if cls._serial and cls._serial.is_open:
            logger.debug(f"返回现有串口连接: port={cls._instance.port}")
            return cls._serial
        
        if cls._instance is None:
            logger.error("未初始化SerialManager实例")
            raise RuntimeError("请先初始化SerialManager实例")
            
        return cls._instance.connect()

    @classmethod
    def is_connected(cls):
        """检查串口是否已连接
        
        Returns:
            bool: 如果串口已连接返回True，否则返回False
        """
        if cls._serial and cls._serial.is_open:
            logger.debug("串口已连接")
            return True
        logger.debug("串口未连接")
        return False

    def connect(self):
        """建立串口连接"""
        if self._serial and self._serial.is_open:
            logger.debug(f"串口已连接: port={self.port}")
            return self._serial

        logger.info(f"开始建立新的串口连接: port={self.port}, baudrate={self.baudrate}, timeout={self.timeout}")
        try:
            # 验证端口是否为空
            if not self.port:
                raise ValueError("串口名称不能为空")
                
            self._serial = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=self.timeout
            )
            logger.info(f"串口连接成功: {self.port}")
            return self._serial
        except serial.SerialException as e:
            logger.error(f"串口连接失败(SerialException): port={self.port}, error={str(e)}")
            return None
        except Exception as e:
            logger.error(f"串口连接失败(未知错误): port={self.port}, error={str(e)}")
            return None

    def disconnect(self):
        """关闭串口连接"""
        if self._serial:
            try:
                self._serial.close()
                self._serial = None
                logger.debug("串口连接已关闭")
            except Exception as e:
                logger.error(f"关闭串口连接时出错: {e}")

    def write(self, data):
        """发送数据"""
        if not self._serial or not self._serial.is_open:
            logger.error("串口连接未建立，无法发送数据")
            return False

        try:
            if isinstance(data, str):
                data = data.encode('utf-8')
            self._serial.write(data)
            return True
        except Exception as e:
            logger.error(f"发送数据时出错: {e}")
            return False

    def read(self, size=1024):
        """读取数据"""
        if not self._serial or not self._serial.is_open:
            logger.error("串口连接未建立，无法读取数据")
            return None

        try:
            return self._serial.read(size)
        except Exception as e:
            logger.error(f"读取数据时出错: {e}")
            return None

    def read_line(self):
        """读取一行数据"""
        if not self._serial or not self._serial.is_open:
            logger.error("串口连接未建立，无法读取数据")
            return None

        try:
            return self._serial.readline()
        except Exception as e:
            logger.error(f"读取数据时出错: {e}")
            return None

    def flush(self):
        """清空缓冲区"""
        if self._serial and self._serial.is_open:
            try:
                self._serial.flush()
            except Exception as e:
                logger.error(f"清空缓冲区时出错: {e}")

    @classmethod
    def reconnect(cls, serialPort, serialBaudRate, timeout=1):
        """重连串口，使用新参数"""
        if cls._instance:
            cls._instance.disconnect()
        cls._instance = SerialManager(serialPort, serialBaudRate, timeout)
        return cls._instance.connect()

    @classmethod
    def disconnect_all(cls):
        """全局断开串口连接"""
        if cls._instance:
            cls._instance.disconnect()
            cls._instance = None
            logger.debug("全局串口连接已断开")

    def __del__(self):
        self.disconnect() 