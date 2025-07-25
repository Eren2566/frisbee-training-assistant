// config/index.js - 应用配置文件

/**
 * 应用配置
 */
const AppConfig = {
  // 应用信息
  app: {
    name: '飞盘队训练助手',
    version: '1.0.0',
    description: '专业的飞盘队训练管理工具'
  },

  // 云开发配置
  cloud: {
    // 云开发环境ID，需要替换为实际的环境ID
    env: 'cloud1-7girgy53fa468831',
    // 是否开启调试模式
    debug: true,
    // 云函数超时时间（毫秒）
    timeout: 10000
  },

  // 数据库配置
  database: {
    collections: {
      users: 'Users',
      events: 'Events',
      registrations: 'Registrations'
    }
  },

  // 云函数配置
  cloudFunctions: {
    userService: 'user_service',
    eventService: 'event_service',
    registrationService: 'registration_service'
  },

  // 用户角色配置
  roles: {
    admin: 'admin',
    member: 'member'
  },

  // 状态配置
  status: {
    // 活动状态
    event: {
      registering: 'registering',
      ongoing: 'ongoing',
      finished: 'finished'
    },
    // 报名状态
    registration: {
      signedUp: 'signed_up',
      leaveRequested: 'leave_requested',
      present: 'present',
      absent: 'absent'
    }
  },

  // UI配置
  ui: {
    // 主题色
    primaryColor: '#1AAD19',
    secondaryColor: '#4CAF50',
    dangerColor: '#e64340',
    warningColor: '#f57c00',
    
    // 分页配置
    pagination: {
      pageSize: 20,
      maxPageSize: 100
    },

    // 加载配置
    loading: {
      defaultText: '加载中...',
      timeout: 10000
    },

    // Toast配置
    toast: {
      duration: 2000,
      mask: true
    }
  },

  // 验证规则配置
  validation: {
    // 训练标题
    eventTitle: {
      minLength: 2,
      maxLength: 50,
      required: true
    },
    // 训练地点
    eventLocation: {
      minLength: 2,
      maxLength: 100,
      required: true
    },
    // 训练内容
    eventContent: {
      minLength: 10,
      maxLength: 500,
      required: true
    },
    // 备注
    eventNotes: {
      maxLength: 200,
      required: false
    },
    // 用户昵称
    nickName: {
      minLength: 1,
      maxLength: 20,
      required: true
    }
  },

  // 时间配置
  time: {
    // 日期格式
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'YYYY-MM-DD HH:mm',
    
    // 时区
    timezone: 'Asia/Shanghai',
    
    // 训练时间限制
    event: {
      // 最早可创建多少天后的训练
      minDaysAhead: 0,
      // 最晚可创建多少天后的训练
      maxDaysAhead: 365,
      // 报名截止时间（训练开始前多少小时）
      registrationDeadlineHours: 2
    }
  },

  // 缓存配置
  cache: {
    // 用户信息缓存时间（毫秒）
    userInfo: 24 * 60 * 60 * 1000, // 24小时
    // 训练列表缓存时间（毫秒）
    eventList: 5 * 60 * 1000, // 5分钟
    // 是否启用缓存
    enabled: true
  },

  // 错误消息配置
  errorMessages: {
    network: '网络连接失败，请检查网络设置',
    timeout: '请求超时，请重试',
    unauthorized: '登录已过期，请重新登录',
    forbidden: '权限不足，无法执行此操作',
    notFound: '请求的资源不存在',
    serverError: '服务器错误，请稍后重试',
    unknown: '未知错误，请重试',
    
    // 业务错误
    loginFailed: '登录失败，请重试',
    createEventFailed: '创建训练失败',
    registerFailed: '报名失败',
    updateAttendanceFailed: '更新出勤状态失败',
    
    // 验证错误
    invalidInput: '输入内容不符合要求',
    requiredField: '请填写必填项',
    invalidDate: '请选择有效的日期时间',
    pastDate: '不能选择过去的时间'
  },

  // 成功消息配置
  successMessages: {
    loginSuccess: '登录成功',
    createEventSuccess: '训练创建成功',
    registerSuccess: '报名成功',
    leaveSuccess: '请假成功',
    updateAttendanceSuccess: '出勤状态更新成功',
    logoutSuccess: '已退出登录'
  },

  // 功能开关配置
  features: {
    // 是否启用出勤统计
    attendanceStats: true,
    // 是否启用消息通知
    notifications: false,
    // 是否启用训练评价
    eventRating: false,
    // 是否启用训练图片上传
    imageUpload: false,
    // 是否启用数据导出
    dataExport: false
  },

  // 开发配置
  development: {
    // 是否显示调试信息
    showDebugInfo: true,
    // 是否启用性能监控
    performanceMonitor: true,
    // 是否启用错误上报
    errorReporting: false,
    // 测试数据
    mockData: false
  }
}

/**
 * 获取配置值
 * @param {string} path 配置路径，如 'ui.primaryColor'
 * @param {any} defaultValue 默认值
 * @returns {any} 配置值
 */
function getConfig(path, defaultValue = null) {
  const keys = path.split('.')
  let value = AppConfig
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key]
    } else {
      return defaultValue
    }
  }
  
  return value
}

/**
 * 设置配置值
 * @param {string} path 配置路径
 * @param {any} value 配置值
 */
function setConfig(path, value) {
  const keys = path.split('.')
  const lastKey = keys.pop()
  let target = AppConfig
  
  for (const key of keys) {
    if (!target[key] || typeof target[key] !== 'object') {
      target[key] = {}
    }
    target = target[key]
  }
  
  target[lastKey] = value
}

/**
 * 检查功能是否启用
 * @param {string} feature 功能名称
 * @returns {boolean} 是否启用
 */
function isFeatureEnabled(feature) {
  return getConfig(`features.${feature}`, false)
}

/**
 * 获取错误消息
 * @param {string} errorType 错误类型
 * @returns {string} 错误消息
 */
function getErrorMessage(errorType) {
  return getConfig(`errorMessages.${errorType}`, AppConfig.errorMessages.unknown)
}

/**
 * 获取成功消息
 * @param {string} successType 成功类型
 * @returns {string} 成功消息
 */
function getSuccessMessage(successType) {
  return getConfig(`successMessages.${successType}`, '操作成功')
}

module.exports = {
  AppConfig,
  getConfig,
  setConfig,
  isFeatureEnabled,
  getErrorMessage,
  getSuccessMessage
}
