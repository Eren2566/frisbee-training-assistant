// utils/common.js - 通用工具函数

/**
 * 时间格式化工具
 */
const TimeUtils = {
  /**
   * 格式化日期时间
   * @param {Date|string} date 日期对象或字符串
   * @param {string} format 格式化模板
   * @returns {string} 格式化后的时间字符串
   */
  format(date, format = 'YYYY-MM-DD HH:mm') {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '无效日期'

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')
    const second = String(d.getSeconds()).padStart(2, '0')

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute)
      .replace('ss', second)
  },

  /**
   * 格式化训练时间显示（统一格式）
   * @param {Date|string} dateTime 日期时间
   * @returns {string} 格式化后的时间字符串
   */
  formatEventTime(dateTime) {
    const date = new Date(dateTime)
    if (isNaN(date.getTime())) return '无效时间'

    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()

    return `${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  },

  /**
   * 格式化训练详情时间显示（完整格式）
   * @param {Date|string} dateTime 日期时间
   * @returns {string} 格式化后的时间字符串
   */
  formatEventDetailTime(dateTime) {
    const date = new Date(dateTime)
    if (isNaN(date.getTime())) return '无效时间'

    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()

    return `${year}年${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  },

  /**
   * 获取相对时间描述
   * @param {Date|string} date 日期
   * @returns {string} 相对时间描述
   */
  getRelativeTime(date) {
    const now = new Date()
    const target = new Date(date)
    const diff = target.getTime() - now.getTime()
    
    if (diff < 0) {
      const pastDiff = Math.abs(diff)
      if (pastDiff < 60000) return '刚刚'
      if (pastDiff < 3600000) return `${Math.floor(pastDiff / 60000)}分钟前`
      if (pastDiff < 86400000) return `${Math.floor(pastDiff / 3600000)}小时前`
      if (pastDiff < 2592000000) return `${Math.floor(pastDiff / 86400000)}天前`
      return this.format(date, 'MM-DD')
    } else {
      if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟后`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时后`
      if (diff < 2592000000) return `${Math.floor(diff / 86400000)}天后`
      return this.format(date, 'MM-DD')
    }
  },

  /**
   * 判断是否为今天
   * @param {Date|string} date 日期
   * @returns {boolean} 是否为今天
   */
  isToday(date) {
    const today = new Date()
    const target = new Date(date)
    return today.toDateString() === target.toDateString()
  },

  /**
   * 判断是否为明天
   * @param {Date|string} date 日期
   * @returns {boolean} 是否为明天
   */
  isTomorrow(date) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const target = new Date(date)
    return tomorrow.toDateString() === target.toDateString()
  }
}

/**
 * 数据验证工具
 */
const ValidateUtils = {
  /**
   * 验证是否为空
   * @param {any} value 值
   * @returns {boolean} 是否为空
   */
  isEmpty(value) {
    return value === null || value === undefined || value === '' || 
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && Object.keys(value).length === 0)
  },

  /**
   * 验证字符串长度
   * @param {string} str 字符串
   * @param {number} min 最小长度
   * @param {number} max 最大长度
   * @returns {boolean} 是否符合长度要求
   */
  validateLength(str, min = 0, max = Infinity) {
    if (typeof str !== 'string') return false
    return str.length >= min && str.length <= max
  },

  /**
   * 验证日期是否有效
   * @param {any} date 日期
   * @returns {boolean} 是否为有效日期
   */
  isValidDate(date) {
    const d = new Date(date)
    return !isNaN(d.getTime())
  },

  /**
   * 验证日期是否在未来
   * @param {any} date 日期
   * @returns {boolean} 是否在未来
   */
  isFutureDate(date) {
    const d = new Date(date)
    return d.getTime() > Date.now()
  }
}

/**
 * 存储工具
 */
const StorageUtils = {
  /**
   * 安全地获取本地存储数据
   * @param {string} key 键名
   * @param {any} defaultValue 默认值
   * @returns {any} 存储的值或默认值
   */
  get(key, defaultValue = null) {
    try {
      const value = wx.getStorageSync(key)
      return value !== '' ? value : defaultValue
    } catch (error) {
      console.error('获取本地存储失败:', error)
      return defaultValue
    }
  },

  /**
   * 安全地设置本地存储数据
   * @param {string} key 键名
   * @param {any} value 值
   * @returns {boolean} 是否设置成功
   */
  set(key, value) {
    try {
      wx.setStorageSync(key, value)
      return true
    } catch (error) {
      console.error('设置本地存储失败:', error)
      return false
    }
  },

  /**
   * 安全地删除本地存储数据
   * @param {string} key 键名
   * @returns {boolean} 是否删除成功
   */
  remove(key) {
    try {
      wx.removeStorageSync(key)
      return true
    } catch (error) {
      console.error('删除本地存储失败:', error)
      return false
    }
  },

  /**
   * 清空所有本地存储
   * @returns {boolean} 是否清空成功
   */
  clear() {
    try {
      wx.clearStorageSync()
      return true
    } catch (error) {
      console.error('清空本地存储失败:', error)
      return false
    }
  }
}

/**
 * 防抖函数
 * @param {Function} func 要防抖的函数
 * @param {number} delay 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, delay = 300) {
  let timeoutId
  return function(...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

/**
 * 节流函数
 * @param {Function} func 要节流的函数
 * @param {number} delay 间隔时间（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, delay = 300) {
  let lastTime = 0
  return function(...args) {
    const now = Date.now()
    if (now - lastTime >= delay) {
      lastTime = now
      func.apply(this, args)
    }
  }
}

/**
 * 深拷贝对象
 * @param {any} obj 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj)
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (typeof obj === 'object') {
    const cloned = {}
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key])
    })
    return cloned
  }
}

/**
 * 生成随机字符串
 * @param {number} length 长度
 * @returns {string} 随机字符串
 */
function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 状态映射工具
 */
const StatusUtils = {
  // 报名状态映射
  registrationStatus: {
    'signed_up': { text: '已报名', class: 'signed-up', color: '#1976d2' },
    'leave_requested': { text: '已请假', class: 'leave-requested', color: '#f57c00' },
    'present': { text: '已出勤', class: 'present', color: '#1AAD19' },
    'absent': { text: '缺勤', class: 'absent', color: '#d32f2f' }
  },

  // 活动状态映射
  eventStatus: {
    'registering': { text: '报名中', class: 'registering', color: '#1AAD19' },
    'finished': { text: '已结束', class: 'finished', color: '#666' }
  },

  /**
   * 获取状态信息
   * @param {string} type 状态类型
   * @param {string} status 状态值
   * @returns {object} 状态信息
   */
  getStatusInfo(type, status) {
    const statusMap = this[type + 'Status'] || {}
    return statusMap[status] || { text: '未知', class: 'unknown', color: '#999' }
  }
}

module.exports = {
  TimeUtils,
  ValidateUtils,
  StorageUtils,
  StatusUtils,
  debounce,
  throttle,
  deepClone,
  generateRandomString
}
