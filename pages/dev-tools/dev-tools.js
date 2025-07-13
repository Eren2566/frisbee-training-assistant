// pages/dev-tools/dev-tools.js - 开发工具页面
const app = getApp()

Page({
  data: {
    currentUser: null,
    testUsers: [],
    isLoading: false
  },

  onLoad() {
    this.loadCurrentUser()
    this.loadTestUsers()
  },

  // 加载当前用户信息
  loadCurrentUser() {
    const userInfo = wx.getStorageSync('userInfo')
    this.setData({
      currentUser: userInfo
    })
  },

  // 加载测试用户列表
  loadTestUsers() {
    this.setData({
      isLoading: true
    })

    wx.cloud.callFunction({
      name: 'system_service',
      data: {
        action: 'getUserManagement',
        options: {
          page: 1,
          limit: 50
        }
      },
      success: (res) => {
        console.log('获取用户列表响应:', res)
        if (res.result.success) {
          console.log('用户数据:', res.result.data.users)
          // 过滤出测试用户
          const testUsers = res.result.data.users.filter(user =>
            user._openid.startsWith('test_')
          )
          console.log('过滤后的测试用户:', testUsers)
          this.setData({
            testUsers: testUsers
          })
        } else {
          console.error('获取用户列表失败:', res.result.message)
          app.showError(res.result.message || '获取用户列表失败')
        }
      },
      fail: (err) => {
        console.error('获取用户列表失败:', err)
        app.showError('获取用户列表失败')
      },
      complete: () => {
        this.setData({
          isLoading: false
        })
      }
    })
  },

  // 创建测试用户
  createTestUsers() {
    wx.showModal({
      title: '确认操作',
      content: '将创建测试用户数据，现有测试用户将被清除',
      success: (res) => {
        if (res.confirm) {
          this.executeCreateTestUsers()
        }
      }
    })
  },

  // 执行创建测试用户
  executeCreateTestUsers() {
    app.showLoading('创建中...')

    wx.cloud.callFunction({
      name: 'system_service',
      data: {
        action: 'createTestUsers'
      },
      success: (res) => {
        console.log('创建测试用户响应:', res)
        if (res.result.success) {
          app.showSuccess(`成功创建 ${res.result.count} 个测试用户`)
          // 延迟一下再加载，确保数据已经写入
          setTimeout(() => {
            this.loadTestUsers()
          }, 1000)
        } else {
          app.showError(res.result.message || '创建失败')
        }
      },
      fail: (err) => {
        console.error('创建测试用户失败:', err)
        app.showError(`创建测试用户失败: ${err.errMsg || '未知错误'}`)

        // 显示详细错误信息
        wx.showModal({
          title: '详细错误信息',
          content: JSON.stringify(err, null, 2),
          showCancel: false
        })
      },
      complete: () => {
        app.hideLoading()
      }
    })
  },

  // 切换用户身份
  switchUser(e) {
    const userIndex = e.currentTarget.dataset.index
    const selectedUser = this.data.testUsers[userIndex]

    wx.showModal({
      title: '切换用户',
      content: `确认切换到用户：${selectedUser.discName || selectedUser.nickName}？`,
      success: (res) => {
        if (res.confirm) {
          this.executeSwitchUser(selectedUser)
        }
      }
    })
  },

  // 执行用户切换
  executeSwitchUser(user) {
    // 更新本地存储
    wx.setStorageSync('userInfo', user)
    
    // 更新全局数据
    app.globalData.userInfo = user
    app.globalData.isLoggedIn = true
    
    // 更新当前显示
    this.setData({
      currentUser: user
    })

    app.showSuccess(`已切换到：${user.discName || user.nickName}`)
  },

  // 清除登录状态
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确认清除当前登录状态？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo')
          app.globalData.userInfo = null
          app.globalData.isLoggedIn = false
          
          this.setData({
            currentUser: null
          })
          
          app.showSuccess('已退出登录')
        }
      }
    })
  },

  // 返回首页
  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})
