// pages/login/login.js
const app = getApp()

Page({
  data: {
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    isLoading: false
  },

  onLoad() {
    // 检查是否已经登录
    if (app.globalData.isLoggedIn) {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  },

  // 获取用户信息并登录
  getUserProfile(e) {
    if (this.data.isLoading) return
    
    this.setData({
      isLoading: true
    })

    // 先获取用户信息
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        console.log('获取用户信息成功:', res)
        this.loginWithUserInfo(res.userInfo)
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err)
        app.showError('获取用户信息失败')
        this.setData({
          isLoading: false
        })
      }
    })
  },

  // 使用用户信息登录
  loginWithUserInfo(userInfo) {
    app.showLoading('登录中...')

    // 调用云函数登录
    wx.cloud.callFunction({
      name: 'user_service',
      data: {
        action: 'login',
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl
      },
      success: (res) => {
        console.log('登录云函数调用成功:', res)
        
        if (res.result.success) {
          const userData = res.result.data
          
          // 保存用户信息到本地存储
          wx.setStorageSync('userInfo', userData)
          
          // 更新全局数据
          app.globalData.userInfo = userData
          app.globalData.isLoggedIn = true
          
          app.showSuccess('登录成功')

          // 根据用户信息完善状态决定跳转路径
          setTimeout(() => {
            if (userData.isInfoCompleted) {
              // 信息已完善，跳转到首页
              wx.switchTab({
                url: '/pages/index/index'
              })
            } else {
              // 信息未完善，跳转到信息完善页面
              wx.redirectTo({
                url: '/pages/user-info/user-info'
              })
            }
          }, 1500)
        } else {
          app.showError(res.result.message || '登录失败')
        }
      },
      fail: (err) => {
        console.error('登录云函数调用失败:', err)
        app.showError('登录失败，请重试')
      },
      complete: () => {
        app.hideLoading()
        this.setData({
          isLoading: false
        })
      }
    })
  },

  // 快速登录（不获取用户信息）
  quickLogin() {
    if (this.data.isLoading) return
    
    this.setData({
      isLoading: true
    })

    this.loginWithUserInfo({
      nickName: '微信用户',
      avatarUrl: ''
    })
  }
})
