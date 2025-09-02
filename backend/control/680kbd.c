#include <linux/input.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <pthread.h>

// 键盘监听线程
void* keyboard_thread(void* arg) {
    const char* dev_path = (const char*)arg;
    struct input_event ev;
    int fd = open(dev_path, O_RDONLY);
    if (fd < 0) {
        perror("无法打开键盘设备");
        return NULL;
    }

    printf("开始监听键盘: %s\n", dev_path);
    while (1) {
        if (read(fd, &ev, sizeof(struct input_event)) != sizeof(struct input_event)) continue;
        if (ev.type == EV_KEY) {
            printf("[键盘] 键码: %d, 状态: %d\n", ev.code, ev.value);
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
        perror("无法打开鼠标设备");
        return NULL;
    }

    int x = 0, y = 0;
    printf("开始监听鼠标: %s\n", dev_path);
    while (1) {
        if (read(fd, &ev, sizeof(struct input_event)) != sizeof(struct input_event)) continue;

        if (ev.type == EV_REL) { // 相对移动
            if (ev.code == REL_X) x += ev.value;
            if (ev.code == REL_Y) y += ev.value;
            printf("[鼠标] 移动: X=%d, Y=%d\n", x, y);
        }

        if (ev.type == EV_KEY) { // 按键事件
            if (ev.code == BTN_LEFT) printf("[鼠标] 左键 %s at X=%d Y=%d\n", ev.value ? "按下" : "释放", x, y);
            if (ev.code == BTN_RIGHT) printf("[鼠标] 右键 %s at X=%d Y=%d\n", ev.value ? "按下" : "释放", x, y);
            if (ev.code == BTN_MIDDLE) printf("[鼠标] 中键 %s at X=%d Y=%d\n", ev.value ? "按下" : "释放", x, y);
        }
    }
    close(fd);
    return NULL;
}

int main() {
    pthread_t kb_thread, mouse_thread_id;

    // 键盘设备路径（根据你的 RK3588 确认）
    const char* kb_dev = "/dev/input/event0"; 
    // 鼠标设备路径（根据你的 RK3588 确认）
    const char* mouse_dev = "/dev/input/event1"; 

    // 创建线程
    pthread_create(&kb_thread, NULL, keyboard_thread, (void*)kb_dev);
    pthread_create(&mouse_thread_id, NULL, mouse_thread, (void*)mouse_dev);

    // 等待线程结束
    pthread_join(kb_thread, NULL);
    pthread_join(mouse_thread_id, NULL);

    return 0;
}
