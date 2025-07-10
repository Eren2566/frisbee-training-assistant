// utils/logger.js - 日志记录工具
const app = getApp()

/**
 * 日志记录工具类
 */
class Logger {
  constructor() {
    this.isDev = true // 开发环境标志，上线前改为 false
  }

  /**
   * 记录信息日志
   * @param {string} tag 标签
   * @param {string} message 消息
   * @param {any} data 附加数据
   */
  info(tag, message, data = null) {
    if (this.isDev) {
      console.log(`[INFO][${tag}] ${message}`, data || '')
    }
  }

  /**
   * 记录警告日志
   * @param {string} tag 标签
   * @param {string} message 消息
   * @param {any} data 附加数据
   */
  warn(tag, message, data = null) {
    if (this.isDev) {
      console.warn(`[WARN][${tag}] ${message}`, data || '')
    }
  }

  /**
   * 记录错误日志
   * @param {string} tag 标签
   * @param {string} message 消息
   * @param {Error|any} error 错误对象
   */
  error(tag, message, error = null) {
    console.error(`[ERROR][${tag}] ${message}`, error || '')
    
    // 在生产环境中，可以将错误上报到监控系统
    if (!this.isDev && error) {
      this.reportError(tag, message, error)
    }
  }

  /**
   * 记录云函数调用日志
   * @param {string} functionName 云函数名称
   * @param {string} action 操作类型
   * @param {any} params 参数
   * @param {boolean} success 是否成功
   * @param {any} result 结果
   */
  cloudFunction(functionName, action, params, success, result) {
    const status = success ? 'SUCCESS' : 'FAILED'
    const message = `云函数调用 ${functionName}.${action} ${status}`
    
    if (this.isDev) {
      console.log(`[CLOUD][${functionName}] ${action}`, {
        params,
        success,
        result
      })
    }

    if (!success) {
      this.error('CloudFunction', message, result)
    }
  }

  /**
   * 记录用户操作日志
   * @param {string} page 页面名称
   * @param {string} action 操作类型
   * @param {any} data 操作数据
   */
  userAction(page, action, data = null) {
    if (this.isDev) {
      console.log(`[USER][${page}] ${action}`, data || '')
    }
  }

  /**
   * 上报错误到监控系统（生产环境）
   * @param {string} tag 标签
   * @param {string} message 消息
   * @param {Error} error 错误对象
   */
  reportError(tag, message, error) {
    // 这里可以集成第三方错误监控服务
    // 例如：腾讯云监控、阿里云监控等
    try {
      // 示例：上报到云函数进行错误记录
      wx.cloud.callFunction({
        name: 'error_reporter',
        data: {
          tag,
          message,
          error: error.toString(),
          stack: error.stack,
          timestamp: new Date().toISOString(),
          userInfo: app.globalData.userInfo
        }
      })
    } catch (reportError) {
      console.error('错误上报失败:', reportError)
    }
  }
}

// 创建全局日志实例
const logger = new Logger()

/**
 * 云函数调用包装器
 * 自动记录调用日志和错误处理
 * @param {string} name 云函数名称
 * @param {object} data 调用参数
 * @returns {Promise} 调用结果
 */
function callCloudFunction(name, data) {
  const { action, ...params } = data
  
  logger.info('CloudFunction', `调用 ${name}.${action}`, params)
  
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        logger.cloudFunction(name, action, params, true, res.result)
        resolve(res)
      },
      fail: (err) => {
        logger.cloudFunction(name, action, params, false, err)
        reject(err)
      }
    })
  })
}

/**
 * 统一错误处理函数
 * @param {Error} error 错误对象
 * @param {string} context 错误上下文
 * @param {boolean} showToUser 是否显示给用户
 */
function handleError(error, context = 'Unknown', showToUser = true) {
  logger.error('ErrorHandler', `${context} 发生错误`, error)
  
  if (showToUser) {
    const message = error.message || '操作失败，请重试'
    app.showError(message)
  }
}

/**
 * 性能监控装饰器
 * @param {string} name 操作名称
 * @param {Function} fn 要监控的函数
 */
function performanceMonitor(name, fn) {
  return function(...args) {
    const startTime = Date.now()
    logger.info('Performance', `${name} 开始执行`)
    
    try {
      const result = fn.apply(this, args)
      
      // 如果是 Promise，监控异步执行时间
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          const endTime = Date.now()
          logger.info('Performance', `${name} 执行完成，耗时: ${endTime - startTime}ms`)
        })
      } else {
        const endTime = Date.now()
        logger.info('Performance', `${name} 执行完成，耗时: ${endTime - startTime}ms`)
        return result
      }
    } catch (error) {
      const endTime = Date.now()
      logger.error('Performance', `${name} 执行失败，耗时: ${endTime - startTime}ms`, error)
      throw error
    }
  }
}

module.exports = {
  logger,
  callCloudFunction,
  handleError,
  performanceMonitor
}
