#include <linux/input.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <errno.h>
#include <string.h>
#include <sys/select.h>

int main() {
    const char* kb_dev = "/dev/input/event0";    // 键盘设备
    const char* mouse_dev = "/dev/input/event1"; // 鼠标设备

    struct input_event ev;
    int kb_fd = open(kb_dev, O_RDONLY | O_NONBLOCK);
    int mouse_fd = open(mouse_dev, O_RDONLY | O_NONBLOCK);
    if (kb_fd < 0) {
        perror("无法打开键盘设备");
        return 1;
    }
    if (mouse_fd < 0) {
        perror("无法打开鼠标设备");
        return 1;
    }

    int x = 0, y = 0; // 鼠标相对坐标

    printf("开始监听键盘和鼠标...\n");

    while (1) {
        fd_set readfds;
        FD_ZERO(&readfds);
        FD_SET(kb_fd, &readfds);
        FD_SET(mouse_fd, &readfds);
        int maxfd = kb_fd > mouse_fd ? kb_fd : mouse_fd;

        int ret = select(maxfd + 1, &readfds, NULL, NULL, NULL);
        if (ret < 0) {
            perror("select 错误");
            break;
        }

        // 处理键盘事件
        if (FD_ISSET(kb_fd, &readfds)) {
            while (read(kb_fd, &ev, sizeof(struct input_event)) == sizeof(struct input_event)) {
                if (ev.type == EV_KEY) {
                    printf("[键盘] 键码: %d, 状态: %d\n", ev.code, ev.value);
                }
            }
        }

        // 处理鼠标事件
        if (FD_ISSET(mouse_fd, &readfds)) {
            while (read(mouse_fd, &ev, sizeof(struct input_event)) == sizeof(struct input_event)) {
                if (ev.type == EV_REL) { // 相对移动
                    if (ev.code == REL_X) x += ev.value;
                    if (ev.code == REL_Y) y += ev.value;
                    printf("[鼠标] 移动: X=%d, Y=%d\n", x, y);
                }
                if (ev.type == EV_KEY) { // 鼠标按键
                    if (ev.code == BTN_LEFT) printf("[鼠标] 左键 %s at X=%d Y=%d\n", ev.value ? "按下" : "释放", x, y);
                    if (ev.code == BTN_RIGHT) printf("[鼠标] 右键 %s at X=%d Y=%d\n", ev.value ? "按下" : "释放", x, y);
                    if (ev.code == BTN_MIDDLE) printf("[鼠标] 中键 %s at X=%d Y=%d\n", ev.value ? "按下" : "释放", x, y);
                }
            }
        }
    }

    close(kb_fd);
    close(mouse_fd);
    return 0;
}
