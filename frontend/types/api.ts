/**
 * API类型定义
 */

// 测试用例接口
export interface TestCase {
  id: number;
  title: string;
  type: string;
  status: string;
  description: string;
  create_time: string;
  last_execution_time: string;
  script_content: string;
  serial_connect: boolean;
  project_name: string;
  project_id: string;
}

// SSH设置接口
export interface SSHSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  enabled?: boolean;
}

// 串口设置接口
export interface SerialSettings {
  port?: string;
  baudrate?: number;
  timeout?: number;
  enabled?: boolean;
  serialPort: string;
  serialBaudRate: string;
}

// 串口端口接口
export interface SerialPort {
  device: string;
  description: string;
  hwid: string;
}

// 测试日志接口
export interface TestLog {
  id: number;
  test_case_id: number;
  timestamp: string;
  log_content: string;
  images: string[];
  screenshots: string[];
  status: string;
}

// 批量执行状态接口
export interface BatchExecutionStatus {
  running: boolean;
  current_case_id?: number;
  completed_count: number;
  total_count: number;
  results: any[];
}


