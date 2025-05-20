export interface StepMethod {
  description: string;
  short_description?: string;
  operation_key?: string;
  verification_key?: string;
  params: string[];
  default_values?: Record<string, any>;
  expected_result?: boolean;
}

export interface StepMethods {
  "操作步骤": Record<string, StepMethod>;
  "验证步骤": Record<string, StepMethod>;
}

const STEP_METHODS: StepMethods = {
  "操作步骤": {
    "获取图像": {
      description: "获取最新图像",
      operation_key: "获取图像",
      params: [],
      default_values: {}
    },
    "获取截图": {
      description: "获取最新截图",
      operation_key: "获取图像",
      params: [],
      default_values: {}
    },
    "获取操作界面": {
      "operation_key": "获取操作界面",
      "description": "使用ffmpeg获取设备操作界面",
      "params": [],
      "default_values": {}
    },
    "点击按钮": {
      description: "点击指定按钮",
      operation_key: "点击",
      params: ["button_name"],
      default_values: {
        button_name: ""
      }
    },
    "长按按钮": {
      description: "长按指定按钮",
      operation_key: "点击",
      params: ["button_name"],
      default_values: {
        button_name: ""
      }
    },
    "滑动操作": {
      description: "从一个点滑动到另一个点",
      operation_key: "滑动",
      params: ["x1", "y1", "x2", "y2"],
      default_values: {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0
      }
    },
    "等待时间": {
      description: "等待指定时间",
      operation_key: "等待时间",
      params: ["waitTimeMs"],
      default_values: {
        waitTimeMs: 1000
      }
    },
    "串口开机": {
      description: "发送开机命令到串口",
      operation_key: "串口开机",
      params: [],
      default_values: {}
    },
    "串口关机": {
      description: "发送关机命令到串口",
      operation_key: "串口关机",
      params: [],
      default_values: {}
    },
    "串口关-开机": {
      description: "发送关机命令后等待指定时间再发送开机命令",
      operation_key: "串口关-开机",
      params: ["waitTimeMs"],
      default_values: {
        waitTimeMs: 1000
      }
    }
  },
  "验证步骤": {
    "对比图像相似度": {
      description: "使用SSIM结构相似性指数比较两张图片，检测图像结构变化。SSIM考虑亮度、对比度和结构三个方面，对光照变化较为鲁棒，适合检测界面布局变化。",
      short_description: "检测结构相似性",
      verification_key: "图像验证",
      params: ["img1", "img2"],
      expected_result: true
    },
    "对比图像关键点": {
      description: "使用ORB特征点检测算法提取并匹配两张图像的关键点。通过比较匹配的特征点数量判断图像变化，适合检测物体是否存在、界面是否缩放等场景。",
      short_description: "检测特征点匹配",
      verification_key: "图像验证",
      params: ["img1", "img2"],
      expected_result: true
    },
    "直方图比较": {
      description: "将图像转换为HSV色彩空间，计算H通道的颜色直方图并比较相似度。使用cv2.compareHist函数计算相关系数，对光照和视角变化有较好的容忍度，适合比较图像整体颜色分布是否相似。",
      short_description: "比较颜色分布",
      verification_key: "图像验证",
      params: ["img1", "img2", "threshold"],
      default_values: {
        threshold: 0.90
      },
      expected_result: true
    },
    "颜色差异分析": {
      description: "逐像素计算两张图像的RGB颜色差异，并取平均值。使用numpy直接计算像素差的绝对值并求均值，对细微变化非常敏感，适合精确检测图像细节变化，如界面色调、亮度调整等。",
      short_description: "像素级颜色对比",
      verification_key: "图像验证",
      params: ["img1", "img2", "threshold"],
      default_values: {
        threshold: 30.0
      },
      expected_result: true
    },
    "模板匹配": {
      description: "使用OpenCV的matchTemplate函数，在大图中查找小图(模板)的位置。采用归一化互相关系数方法(TM_CCOEFF_NORMED)，对模板在图像中的匹配程度进行打分。适合检测特定UI元素、图标或按钮是否出现在界面中。",
      short_description: "查找子图位置",
      verification_key: "图像验证",
      params: ["img1", "img2", "threshold"],
      default_values: {
        threshold: 0.8
      },
      expected_result: true
    },
    "边缘检测比较": {
      description: "使用Canny边缘检测算法提取图像的边缘特征，然后比较两张图像的边缘相似度。该方法着重比较图像的结构和轮廓，对光照变化不敏感，适合检测UI界面布局、按钮形状等结构性变化。",
      short_description: "比较轮廓结构",
      verification_key: "图像验证",
      params: ["img1", "img2", "threshold"],
      default_values: {
        threshold: 0.60
      },
      expected_result: true
    },
    "亮度差异比较": {
      description: "计算两张图像的平均亮度差异。该方法专注于检测画面整体亮度变化，适用于检测夜间模式切换、背光调节、亮度设置等功能的测试场景。",
      short_description: "检测亮度变化",
      verification_key: "图像验证",
      params: ["img1", "img2", "threshold"],
      default_values: {
        threshold: 20.0
      },
      expected_result: true
    },
    "对比度比较": {
      description: "通过计算灰度图像的标准差来衡量图像对比度，并比较两张图像的对比度相似性。适用于检测对比度调节、图像增强等功能，以及评估显示质量的变化。",
      short_description: "检测对比度变化",
      verification_key: "图像验证",
      params: ["img1", "img2", "threshold"],
      default_values: {
        threshold: 0.70
      },
      expected_result: true
    },
    "纹理特征比较": {
      description: "使用简化的纹理特征分析方法，比较两张图像的纹理相似度。该方法适用于检测表面质感、图案细节等微观变化，对于材质渲染、滤镜效果等功能测试特别有效。",
      short_description: "比较表面质感",
      verification_key: "图像验证",
      params: ["img1", "img2", "threshold"],
      default_values: {
        threshold: 0.65
      },
      expected_result: true
    }
  }
};

export default STEP_METHODS; 