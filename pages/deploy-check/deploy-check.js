// pages/deploy-check/deploy-check.js - 部署状态检查页面
const app = getApp()

Page({
  data: {
    checkResults: [],
    overallStatus: 'checking', // checking, success, warning, error
    isChecking: false,
    checkProgress: 0
  },

  onLoad() {
    this.startDeploymentCheck()
  },

  // 开始部署检查
  async startDeploymentCheck() {
    this.setData({
      isChecking: true,
      checkProgress: 0,
      checkResults: []
    })

    const checks = [
      { name: '小程序基础配置', check: this.checkBasicConfig },
      { name: '云开发环境', check: this.checkCloudEnvironment },
      { name: '用户服务云函数', check: this.checkUserService },
      { name: '训练服务云函数', check: this.checkEventService },
      { name: '报名服务云函数', check: this.checkRegistrationService },
      { name: '数据库集合', check: this.checkDatabaseCollections },
      { name: '用户登录功能', check: this.checkUserLogin },
      { name: '权限控制', check: this.checkPermissions }
    ]

    const results = []
    let successCount = 0

    for (let i = 0; i < checks.length; i++) {
      const checkItem = checks[i]
      this.setData({
        checkProgress: Math.round(((i + 1) / checks.length) * 100)
      })

      try {
        const result = await checkItem.check.call(this)
        results.push({
          name: checkItem.name,
          status: result.success ? 'success' : 'error',
          message: result.message,
          details: result.details || null
        })
        
        if (result.success) successCount++
      } catch (error) {
        results.push({
          name: checkItem.name,
          status: 'error',
          message: error.message || '检查失败',
          details: null
        })
      }

      this.setData({
        checkResults: results
      })

      // 添加延迟，让用户看到检查过程
      await this.delay(500)
    }

    // 确定整体状态
    let overallStatus = 'success'
    if (successCount === 0) {
      overallStatus = 'error'
    } else if (successCount < checks.length) {
      overallStatus = 'warning'
    }

    this.setData({
      isChecking: false,
      overallStatus: overallStatus
    })
  },

  // 检查基础配置
  async checkBasicConfig() {
    const appConfig = getApp().globalData.config
    
    if (!appConfig) {
      return {
        success: false,
        message: '应用配置未正确加载'
      }
    }

    // 检查版本信息
    if (!appConfig.version) {
      return {
        success: false,
        message: '版本信息缺失'
      }
    }

    return {
      success: true,
      message: `配置正常，版本：${appConfig.version}`,
      details: appConfig
    }
  },

  // 检查云开发环境
  async checkCloudEnvironment() {
    try {
      // 尝试调用云开发API
      const result = await wx.cloud.callFunction({
        name: 'user_service',
        data: { action: 'test' }
      })

      return {
        success: true,
        message: '云开发环境连接正常'
      }
    } catch (error) {
      return {
        success: false,
        message: '云开发环境连接失败：' + error.errMsg
      }
    }
  },

  // 检查用户服务云函数
  async checkUserService() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user_service',
        data: { action: 'test' }
      })

      return {
        success: true,
        message: '用户服务云函数正常'
      }
    } catch (error) {
      return {
        success: false,
        message: '用户服务云函数异常：' + (error.errMsg || error.message)
      }
    }
  },

  // 检查训练服务云函数
  async checkEventService() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'event_service',
        data: { action: 'getList' }
      })

      return {
        success: result.result && result.result.success,
        message: result.result && result.result.success ? 
          '训练服务云函数正常' : 
          '训练服务云函数返回错误：' + (result.result?.message || '未知错误')
      }
    } catch (error) {
      return {
        success: false,
        message: '训练服务云函数异常：' + (error.errMsg || error.message)
      }
    }
  },

  // 检查报名服务云函数
  async checkRegistrationService() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'registration_service',
        data: { action: 'getMyList' }
      })

      return {
        success: result.result && result.result.success,
        message: result.result && result.result.success ? 
          '报名服务云函数正常' : 
          '报名服务云函数返回错误：' + (result.result?.message || '未知错误')
      }
    } catch (error) {
      return {
        success: false,
        message: '报名服务云函数异常：' + (error.errMsg || error.message)
      }
    }
  },

  // 检查数据库集合
  async checkDatabaseCollections() {
    try {
      const db = wx.cloud.database()
      
      // 检查必需的集合
      const collections = ['Users', 'Events', 'Registrations']
      const results = []

      for (const collection of collections) {
        try {
          await db.collection(collection).limit(1).get()
          results.push(`${collection}: ✓`)
        } catch (error) {
          results.push(`${collection}: ✗`)
        }
      }

      const successCount = results.filter(r => r.includes('✓')).length
      
      return {
        success: successCount === collections.length,
        message: successCount === collections.length ? 
          '所有数据库集合正常' : 
          `${successCount}/${collections.length} 个集合可用`,
        details: results
      }
    } catch (error) {
      return {
        success: false,
        message: '数据库连接失败：' + error.message
      }
    }
  },

  // 检查用户登录功能
  async checkUserLogin() {
    const userInfo = wx.getStorageSync('userInfo')
    
    if (!userInfo || !userInfo._openid) {
      return {
        success: false,
        message: '用户未登录，请先完成登录流程'
      }
    }

    return {
      success: true,
      message: `用户已登录：${userInfo.nickName}`,
      details: {
        role: userInfo.role,
        openid: userInfo._openid.substring(0, 8) + '...'
      }
    }
  },

  // 检查权限控制
  async checkPermissions() {
    const userInfo = wx.getStorageSync('userInfo')
    
    if (!userInfo) {
      return {
        success: false,
        message: '无法检查权限，用户未登录'
      }
    }

    const isAdmin = userInfo.role === 'admin'
    
    return {
      success: true,
      message: `权限检查正常，当前角色：${isAdmin ? '管理员' : '队员'}`,
      details: {
        role: userInfo.role,
        permissions: isAdmin ? ['创建训练', '管理报名', '确认出勤'] : ['查看训练', '报名请假', '查看记录']
      }
    }
  },

  // 重新检查
  onRetryCheck() {
    this.startDeploymentCheck()
  },

  // 查看详情
  onViewDetails(e) {
    const index = e.currentTarget.dataset.index
    const result = this.data.checkResults[index]
    
    if (result.details) {
      wx.showModal({
        title: result.name + ' - 详细信息',
        content: JSON.stringify(result.details, null, 2),
        showCancel: false
      })
    }
  },

  // 获取帮助
  onGetHelp() {
    wx.showModal({
      title: '部署帮助',
      content: '如果检查失败，请参考 QUICK_DEPLOY.md 文档进行排查，或查看云开发控制台的错误日志。',
      showCancel: false
    })
  },

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
})
