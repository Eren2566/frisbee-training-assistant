// pages/index/index.js
const app = getApp()
const { getUserDisplayName, getUserRoleText } = require('../../utils/userUtils.js')

Page({
  data: {
    userInfo: null,
    isLoggedIn: false
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo._openid) {
      this.setData({
        userInfo: userInfo,
        isLoggedIn: true
      })
      app.globalData.userInfo = userInfo
      app.globalData.isLoggedIn = true
    } else {
      this.setData({
        isLoggedIn: false
      })
      app.globalData.isLoggedIn = false
    }
  },

  // 跳转到登录页面
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  // 跳转到训练列表
  goToEventList() {
    wx.switchTab({
      url: '/pages/event-list/event-list'
    })
  },

  // 跳转到个人中心
  goToProfile() {
    wx.switchTab({
      url: '/pages/my-profile/my-profile'
    })
  },

  // 跳转到创建训练页面
  goToCreateEvent() {
    wx.navigateTo({
      url: '/pages/admin/create-event/create-event'
    })
  }
})
