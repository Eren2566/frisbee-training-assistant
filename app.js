// app.js
const { getConfig } = require('./config/index.js')
const { userDataManager } = require('./services/dataManager.js')
const { logger } = require('./utils/logger.js')

App({
  onLaunch() {
    logger.info('App', '小程序启动')

    // 初始化云开发
    this.initCloud()

    // 检查登录状态
    this.checkLoginStatus()

    // 初始化全局配置
    this.initGlobalConfig()
  },

  onShow() {
    logger.info('App', '小程序显示')
  },

  onHide() {
    logger.info('App', '小程序隐藏')
  },

  onError(error) {
    logger.error('App', '小程序错误', error)
  },

  // 初始化云开发
  initCloud() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      this.showError('小程序版本过低，请更新微信')
      return
    }

    try {
      wx.cloud.init({
        env: getConfig('cloud.env', 'cloud1-7girgy53fa468831'),
        traceUser: true,
      })
      logger.info('App', '云开发初始化成功')
    } catch (error) {
      logger.error('App', '云开发初始化失败', error)
      this.showError('云服务初始化失败')
    }
  },

  // 检查用户登录状态
  checkLoginStatus() {
    const userInfo = userDataManager.getCurrentUser()
    if (userInfo && userInfo._openid) {
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
      logger.info('App', '用户已登录', { role: userInfo.role })
    } else {
      this.globalData.isLoggedIn = false
      logger.info('App', '用户未登录')
    }
  },

  // 初始化全局配置
  initGlobalConfig() {
    // 设置全局配置
    this.globalData.config = {
      version: getConfig('app.version'),
      isDev: getConfig('development.showDebugInfo', false)
    }
  },

  // 全局数据
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    config: {}
  },

  // 工具函数：显示加载中
  showLoading(title = null) {
    const loadingTitle = title || getConfig('ui.loading.defaultText', '加载中...')
    wx.showLoading({
      title: loadingTitle,
      mask: getConfig('ui.toast.mask', true)
    })
  },

  // 工具函数：隐藏加载
  hideLoading() {
    wx.hideLoading()
  },

  // 工具函数：显示成功提示
  showSuccess(title) {
    wx.showToast({
      title: title,
      icon: 'success',
      duration: getConfig('ui.toast.duration', 2000),
      mask: getConfig('ui.toast.mask', true)
    })
  },

  // 工具函数：显示错误提示
  showError(title) {
    wx.showToast({
      title: title,
      icon: 'none',
      duration: getConfig('ui.toast.duration', 2000),
      mask: getConfig('ui.toast.mask', true)
    })
  },

  // 工具函数：显示确认对话框
  showConfirm(options) {
    return new Promise((resolve) => {
      wx.showModal({
        title: options.title || '确认',
        content: options.content || '',
        showCancel: options.showCancel !== false,
        confirmText: options.confirmText || '确定',
        cancelText: options.cancelText || '取消',
        success: (res) => {
          resolve(res.confirm)
        },
        fail: () => {
          resolve(false)
        }
      })
    })
  },

  // 工具函数：检查网络状态
  checkNetworkStatus() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          const isConnected = res.networkType !== 'none'
          if (!isConnected) {
            this.showError('网络连接失败，请检查网络设置')
          }
          resolve(isConnected)
        },
        fail: () => {
          this.showError('网络状态检查失败')
          resolve(false)
        }
      })
    })
  },

  // 工具函数：获取系统信息
  getSystemInfo() {
    return new Promise((resolve) => {
      wx.getSystemInfo({
        success: resolve,
        fail: () => resolve({})
      })
    })
  }
})
