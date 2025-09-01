#include <linux/input.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>
#include <sys/time.h>
#include <stdlib.h>   // atoi
#include <stdio.h>    // printf, perror

int main(int argc, char *argv[]) {
    if(argc < 2) {
        printf("Usage: %s <duration_in_seconds>\n", argv[0]);
        return 1;
    }

    int duration = atoi(argv[1]); // 获取命令行传入的持续时间
    if(duration < 0) duration = 0; // 防止负数

    int fd = open("/dev/input/event0", O_WRONLY);
    if(fd < 0) {
        perror("open /dev/input/event0 failed");
        return 1;
    }

    struct input_event ev;
    memset(&ev, 0, sizeof(ev));

    // =======================
    // 按下按键
    // =======================
    gettimeofday(&ev.time, NULL);
    ev.type = EV_KEY;
    ev.code = KEY_POWER;
    ev.value = 1;  // 按下
    write(fd, &ev, sizeof(ev));

    // 同步事件
    gettimeofday(&ev.time, NULL);
    ev.type = EV_SYN;
    ev.code = SYN_REPORT;
    ev.value = 0;
    write(fd, &ev, sizeof(ev));

    // =======================
    // 持续按下
    // =======================
    sleep(duration);

    // =======================
    // 松开按键
    // =======================
    gettimeofday(&ev.time, NULL);
    ev.type = EV_KEY;
    ev.code = KEY_POWER;
    ev.value = 0;  // 松开
    write(fd, &ev, sizeof(ev));

    // 同步事件
    gettimeofday(&ev.time, NULL);
    ev.type = EV_SYN;
    ev.code = SYN_REPORT;
    ev.value = 0;
    write(fd, &ev, sizeof(ev));

    close(fd);
    return 0;
}
