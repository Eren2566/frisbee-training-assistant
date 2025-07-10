// pages/my-profile/my-profile.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    myRegistrations: [],
    isLoading: false,
    stats: {
      totalEvents: 0,
      attendedEvents: 0,
      attendanceRate: 0
    }
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
    if (this.data.isLoggedIn) {
      this.loadMyRegistrations()
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo._openid) {
      this.setData({
        userInfo: userInfo,
        isLoggedIn: true
      })
    } else {
      this.setData({
        isLoggedIn: false
      })
    }
  },

  // 跳转到登录页面
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  // 加载我的报名记录
  loadMyRegistrations() {
    if (this.data.isLoading) return

    this.setData({
      isLoading: true
    })

    wx.cloud.callFunction({
      name: 'registration_service',
      data: {
        action: 'getMyList'
      },
      success: (res) => {
        console.log('获取我的报名记录成功:', res)
        
        if (res.result.success) {
          const registrations = res.result.data
          this.setData({
            myRegistrations: registrations
          })
          this.calculateStats(registrations)
        } else {
          app.showError(res.result.message || '获取报名记录失败')
        }
      },
      fail: (err) => {
        console.error('获取报名记录失败:', err)
        app.showError('获取报名记录失败')
      },
      complete: () => {
        this.setData({
          isLoading: false
        })
      }
    })
  },

  // 计算统计数据
  calculateStats(registrations) {
    const totalEvents = registrations.length
    const attendedEvents = registrations.filter(item => item.status === 'present').length
    const attendanceRate = totalEvents > 0 ? Math.round((attendedEvents / totalEvents) * 100) : 0

    this.setData({
      stats: {
        totalEvents,
        attendedEvents,
        attendanceRate
      }
    })
  },

  // 跳转到训练详情
  goToEventDetail(e) {
    const eventId = e.currentTarget.dataset.eventId
    wx.navigateTo({
      url: `/pages/event-detail/event-detail?id=${eventId}`
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储
          wx.removeStorageSync('userInfo')
          
          // 清除全局数据
          app.globalData.userInfo = null
          app.globalData.isLoggedIn = false
          
          // 更新页面状态
          this.setData({
            userInfo: null,
            isLoggedIn: false,
            myRegistrations: [],
            stats: {
              totalEvents: 0,
              attendedEvents: 0,
              attendanceRate: 0
            }
          })
          
          app.showSuccess('已退出登录')
        }
      }
    })
  },

  // 获取状态文本和样式
  getStatusInfo(status) {
    const statusMap = {
      'signed_up': { text: '已报名', class: 'signed-up' },
      'leave_requested': { text: '已请假', class: 'leave-requested' },
      'present': { text: '已出勤', class: 'present' },
      'absent': { text: '缺勤', class: 'absent' }
    }
    return statusMap[status] || { text: '未知', class: 'unknown' }
  },

  // 格式化时间
  formatTime(timeStr) {
    const date = new Date(timeStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    
    return `${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }
})
