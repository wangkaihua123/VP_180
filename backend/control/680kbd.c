#include <linux/input.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <pthread.h>
#include <sys/time.h>
#include <stdlib.h>

// 获取当前时间戳（毫秒）
long long get_timestamp_ms() {
    struct timeval tv;
    gettimeofday(&tv, NULL);
    return (long long)tv.tv_sec * 1000 + tv.tv_usec / 1000;
}

// 键盘监听线程
void* keyboard_thread(void* arg) {
    const char* dev_path = (const char*)arg;
    struct input_event ev;
    int fd = open(dev_path, O_RDONLY);
    if (fd < 0) {
        fprintf(stderr, "{\"type\":\"error\",\"message\":\"无法打开键盘设备: %s\"}\n", dev_path);
        return NULL;
    }

    // 输出初始化消息
    fprintf(stdout, "{\"type\":\"status\",\"message\":\"开始监听键盘: %s\"}\n", dev_path);
    fflush(stdout);
    
    while (1) {
        if (read(fd, &ev, sizeof(struct input_event)) != sizeof(struct input_event)) continue;
        
        if (ev.type == EV_KEY) {
            long long timestamp = get_timestamp_ms();
            fprintf(stdout, "{\"type\":\"keyboard\",\"code\":%d,\"value\":%d,\"timestamp\":%lld}\n",
                    ev.code, ev.value, timestamp);
            fflush(stdout);
        }
    }
    close(fd);
    return NULL;
}

// 鼠标监听线程
void* mouse_thread(void* arg) {
    const char* dev_path = (const char*)arg;
    struct input_event ev;
    int fd = open(dev_path, O_RDONLY);
    if (fd < 0) {
        fprintf(stderr, "{\"type\":\"error\",\"message\":\"无法打开鼠标设备: %s\"}\n", dev_path);
        return NULL;
    }
    
    // 输出初始化消息
    fprintf(stdout, "{\"type\":\"status\",\"message\":\"开始监听鼠标按键和坐标: %s\"}\n", dev_path);
    fflush(stdout);
    
    // 记录当前鼠标坐标
    int x = 0, y = 0;
    
    while (1) {
        if (read(fd, &ev, sizeof(struct input_event)) != sizeof(struct input_event)) continue;

        if (ev.type == EV_REL) { // 鼠标移动事件
            if (ev.code == REL_X) {
                x += ev.value;
            } else if (ev.code == REL_Y) {
                y += ev.value;
            }
        } else if (ev.type == EV_KEY) { // 按键事件
            long long timestamp = get_timestamp_ms();
            const char* button_name = "";
            const char* action = ev.value ? "press" : "release";
            
            if (ev.code == BTN_LEFT) button_name = "left";
            else if (ev.code == BTN_RIGHT) button_name = "right";
            else if (ev.code == BTN_MIDDLE) button_name = "middle";
            else continue; // 忽略其他按键
            
            fprintf(stdout, "{\"type\":\"mouse_button\",\"button\":\"%s\",\"action\":\"%s\",\"x\":%d,\"y\":%d,\"timestamp\":%lld}\n",
                    button_name, action, x, y, timestamp);
            fflush(stdout);
        }
    }
    close(fd);
    return NULL;
}

int main(int argc, char *argv[]) {
    pthread_t kb_thread, mouse_thread_id;

    // 允许通过命令行参数指定设备路径
    const char* kb_dev = "/dev/input/event0";
    const char* mouse_dev = "/dev/input/event1";
    
    if (argc >= 3) {
        kb_dev = argv[1];
        mouse_dev = argv[2];
    }

    // 输出启动消息
    fprintf(stdout, "{\"type\":\"status\",\"message\":\"键盘和鼠标按键监听程序已启动\"}\n");
    fflush(stdout);

    // 创建线程
    pthread_create(&kb_thread, NULL, keyboard_thread, (void*)kb_dev);
    pthread_create(&mouse_thread_id, NULL, mouse_thread, (void*)mouse_dev);

    // 等待线程结束
    pthread_join(kb_thread, NULL);
    pthread_join(mouse_thread_id, NULL);

    return 0;
}
