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
        # 只在第一次初始化
        if not hasattr(self, 'initialized') or not self.initialized:
            if serialPort is None or serialBaudRate is None:
                raise ValueError("必须传递serialPort和serialBaudRate参数！")
            self.port = serialPort
            self.baudrate = int(serialBaudRate)
            self.timeout = timeout
            self.initialized = True
            logger.debug(f"串口管理器初始化完成: port={self.port}, baudrate={self.baudrate}")

    @classmethod
    def get_instance(cls, serialPort=None, serialBaudRate=None, timeout=1):
        if cls._instance is None:
            cls._instance = SerialManager(serialPort, serialBaudRate, timeout)
        return cls._instance

    @classmethod
    def get_client(cls):
        """获取已存在的串口连接或创建新的"""
        if cls._serial and cls._serial.is_open:
            logger.debug("返回现有串口连接")
            return cls._serial
        
        instance = cls.get_instance()
        return instance.connect()

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
            logger.debug("串口已连接")
            return self._serial

        logger.debug(f"开始建立新的串口连接... port={self.port}, baudrate={self.baudrate}, timeout={self.timeout}")
        try:
            self._serial = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=self.timeout
            )
            logger.debug("串口连接成功")
            return self._serial
        except Exception as e:
            logger.error(f"串口连接失败: {e}")
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