"""
VP180 日志监控工具

注意：此工具的功能已部分禁用，因为VP_180.log文件生成功能已被移除。
此工具保留仅用于兼容性和未来可能的恢复。
"""

import os
import time
import argparse
import sys
from typing import Optional, Dict, TextIO


class LogMonitor:
    """日志文件监控类，实现类似 'tail -f' 的功能"""

    # ANSI颜色代码
    COLORS = {
        'RESET': '\033[0m',
        'INFO': '\033[32m',  # 绿色
        'ERROR': '\033[31m',  # 红色
        'WARNING': '\033[33m',  # 黄色
        'DEBUG': '\033[36m',  # 青色
        'TRACE': '\033[35m',  # 洋红色
        'CRITICAL': '\033[41m\033[37m',  # 红底白字
    }

    def __init__(self, log_file: str, color: bool = True, follow_sleep: float = 0.1):
        """
        初始化日志监控器

        Args:
            log_file: 要监控的日志文件路径
            color: 是否启用彩色输出
            follow_sleep: 文件检查的时间间隔(秒)
        """
        self.log_file = log_file
        self.use_color = color
        self.follow_sleep = follow_sleep
        self.running = False

    def colorize(self, line: str) -> str:
        """
        根据日志级别为行添加颜色

        Args:
            line: 日志行

        Returns:
            带颜色的日志行
        """
        if not self.use_color:
            return line

        # 检测日志级别并添加相应颜色
        for level in self.COLORS:
            if level != 'RESET' and f" - {level} - " in line:
                return f"{self.COLORS[level]}{line}{self.COLORS['RESET']}"
        return line

    def follow(self, file: TextIO):
        """
        跟踪文件的新增内容，类似于 'tail -f' 的功能

        Args:
            file: 打开的文件对象
        """
        # 移动到文件末尾
        file.seek(0, os.SEEK_END)
        
        while self.running:
            line = file.readline()
            if line:
                yield line
            else:
                # 检查文件是否被截断
                curr_position = file.tell()
                file.seek(0, os.SEEK_END)
                if file.tell() < curr_position:
                    # 文件被截断，重新从头开始
                    file.seek(0, os.SEEK_SET)
                else:
                    # 回到之前的位置，等待新内容
                    file.seek(curr_position)
                    time.sleep(self.follow_sleep)

    def start(self, tail_lines: int = 10):
        """
        开始监控日志文件

        Args:
            tail_lines: 启动时显示的最后几行日志数
        """
        # 警告用户日志功能已禁用
        print(f"{self.COLORS['WARNING']}警告: 日志文件功能已禁用，VP_180.log不再生成。{self.COLORS['RESET']}")
        print(f"{self.COLORS['WARNING']}日志现在只会输出到控制台。{self.COLORS['RESET']}")
        
        # 确保文件存在
        if not os.path.exists(self.log_file):
            print(f"错误: 日志文件 '{self.log_file}' 不存在")
            return

        try:
            # 显示最后几行
            if tail_lines > 0:
                self._show_last_lines(tail_lines)
                print("-" * 80)
                print(f"正在监控日志文件: {self.log_file} (按Ctrl+C停止)")
                print("-" * 80)

            self.running = True
            with open(self.log_file, 'r', encoding='utf-8') as file:
                for line in self.follow(file):
                    print(self.colorize(line.rstrip('\n')))
        except KeyboardInterrupt:
            self.handle_interrupt()
        except Exception as e:
            print(f"监控日志时出错: {str(e)}")
        finally:
            self.running = False

    def _show_last_lines(self, count: int):
        """
        显示文件的最后几行

        Args:
            count: 要显示的行数
        """
        try:
            with open(self.log_file, 'r', encoding='utf-8') as file:
                lines = file.readlines()
                for line in lines[-count:]:
                    print(self.colorize(line.rstrip('\n')))
        except Exception as e:
            print(f"读取文件最后几行时出错: {str(e)}")

    def handle_interrupt(self):
        """处理用户中断(Ctrl+C)"""
        print("\n日志监控已停止")
        self.running = False


def main():
    """主函数，处理命令行参数并启动日志监控"""
    print("注意: 日志文件功能已禁用，VP_180.log不再生成。此工具保留仅用于兼容性。")
    
    # 计算默认日志文件路径
    default_log_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'data', 'VP_180.log'
    )

    # 设置命令行参数
    parser = argparse.ArgumentParser(description='监控VP_180日志文件')
    parser.add_argument('-f', '--file', default=default_log_path,
                        help=f'要监控的日志文件路径 (默认: {default_log_path})')
    parser.add_argument('-n', '--lines', type=int, default=10,
                        help='开始时显示的行数 (默认: 10)')
    parser.add_argument('--no-color', action='store_true',
                        help='禁用彩色输出')
    parser.add_argument('-s', '--sleep', type=float, default=0.1,
                        help='检查文件变化的时间间隔(秒) (默认: 0.1)')
    
    args = parser.parse_args()
    
    # 创建并启动监控器
    monitor = LogMonitor(
        log_file=args.file,
        color=not args.no_color,
        follow_sleep=args.sleep
    )
    monitor.start(tail_lines=args.lines)


if __name__ == "__main__":
    main() 