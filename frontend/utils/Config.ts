export interface FunctionConfig {
  screen: [number, number];
  touch: [number, number];
  chinese_name: string;
}

export interface Functions {
  [key: string]: FunctionConfig;
}

export const FUNCTIONS: Functions = {
  "MainInterface": { screen: [45, 160], touch: [421, 2559], chinese_name: "主界面" },
  "UserConfig": { screen: [45, 330], touch: [421, 5279], chinese_name: "用户配置" },
  "Settings": { screen: [45, 510], touch: [421, 8158], chinese_name: "设置" },
  "WhiteBalance": { screen: [200, 250], touch: [1874, 3999], chinese_name: "白平衡" },
  "Zoom": { screen: [400, 250], touch: [3749, 3999], chinese_name: "电子放大" },
  "ImageEnhance": { screen: [600, 250], touch: [5624, 3999], chinese_name: "图像增强" },
  "Freeze": { screen: [800, 210], touch: [7499, 3359], chinese_name: "图像冻结" },
  "SaveImage": { screen: [930, 210], touch: [8718, 3359], chinese_name: "保存图像" },
  "Screenshot": { screen: [800, 380], touch: [7499, 6078], chinese_name: "屏幕截图" },
  "Record": { screen: [930, 380], touch: [8718, 6078], chinese_name: "录制" },
  "USBExit": { screen: [930, 510], touch: [8718, 8158], chinese_name: "USB退出" },
  "Export": { screen: [800, 510], touch: [7499, 8158], chinese_name: "导出" },
  "PIP_POP": { screen: [560, 490], touch: [5249, 7838], chinese_name: "画中画" },
  "MeteringMode": { screen: [250, 490], touch: [2343, 7838], chinese_name: "测光模式" }
}; 