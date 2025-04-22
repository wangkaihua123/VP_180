"""
移动日志文件脚本 - 将@logs目录中的文件移动到logs目录
"""
import os
import shutil
import glob

# 项目根目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 源目录和目标目录
SOURCE_DIR = os.path.join(BASE_DIR, 'data', 'logs', '@logs')
TARGET_DIR = os.path.join(BASE_DIR, 'data', 'logs')

# 处理函数
def move_logs():
    """将@logs目录中的文件移动到logs目录"""
    if not os.path.exists(SOURCE_DIR):
        print(f"源目录不存在: {SOURCE_DIR}")
        return False
    
    print(f"移动 {SOURCE_DIR} 中的文件到 {TARGET_DIR}")
    
    # 移动直接位于@logs目录下的文件
    files_moved = 0
    for file_path in glob.glob(os.path.join(SOURCE_DIR, '*')):
        if os.path.isfile(file_path):
            file_name = os.path.basename(file_path)
            target_path = os.path.join(TARGET_DIR, file_name)
            
            # 确保目标文件不存在，或者覆盖它
            if os.path.exists(target_path):
                print(f"目标文件已存在，覆盖: {target_path}")
            
            shutil.copy2(file_path, target_path)
            print(f"已复制: {file_path} -> {target_path}")
            files_moved += 1
    
    # 移动子目录中的文件
    for dir_path in glob.glob(os.path.join(SOURCE_DIR, '*')):
        if os.path.isdir(dir_path):
            dir_name = os.path.basename(dir_path)
            target_subdir = os.path.join(TARGET_DIR, dir_name)
            
            # 确保目标目录存在
            os.makedirs(target_subdir, exist_ok=True)
            
            # 复制目录中的所有文件
            for file_path in glob.glob(os.path.join(dir_path, '*')):
                if os.path.isfile(file_path):
                    file_name = os.path.basename(file_path)
                    target_path = os.path.join(target_subdir, file_name)
                    
                    # 确保目标文件不存在，或者覆盖它
                    if os.path.exists(target_path):
                        print(f"目标文件已存在，覆盖: {target_path}")
                    
                    shutil.copy2(file_path, target_path)
                    print(f"已复制: {file_path} -> {target_path}")
                    files_moved += 1
    
    print(f"共移动了 {files_moved} 个文件")
    
    # 询问是否删除@logs目录
    confirm = input(f"是否删除@logs目录? (y/n): ")
    if confirm.lower() == 'y':
        try:
            shutil.rmtree(SOURCE_DIR)
            print(f"已删除@logs目录: {SOURCE_DIR}")
            return True
        except Exception as e:
            print(f"删除@logs目录时出错: {e}")
            return False
    else:
        print(f"保留@logs目录: {SOURCE_DIR}")
        return True

if __name__ == "__main__":
    move_logs() 