// pages/event-list/event-list.js
const app = getApp()

Page({
  data: {
    eventList: [],
    isLoading: false,
    userInfo: null,
    isAdmin: false
  },

  onLoad() {
    this.checkLoginAndLoadData()
  },

  onShow() {
    this.checkLoginAndLoadData()
  },

  // 检查登录状态并加载数据
  checkLoginAndLoadData() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo._openid) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.navigateTo({
            url: '/pages/login/login'
          })
        }
      })
      return
    }

    this.setData({
      userInfo: userInfo,
      isAdmin: userInfo.role === 'admin'
    })

    this.loadEventList()
  },

  // 加载训练列表
  loadEventList() {
    if (this.data.isLoading) return

    this.setData({
      isLoading: true
    })

    wx.cloud.callFunction({
      name: 'event_service',
      data: {
        action: 'getList'
      },
      success: (res) => {
        console.log('获取训练列表成功:', res)
        
        if (res.result.success) {
          this.setData({
            eventList: res.result.data
          })
        } else {
          app.showError(res.result.message || '获取训练列表失败')
        }
      },
      fail: (err) => {
        console.error('获取训练列表失败:', err)
        app.showError('获取训练列表失败')
      },
      complete: () => {
        this.setData({
          isLoading: false
        })
        wx.stopPullDownRefresh()
      }
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadEventList()
  },

  // 跳转到训练详情
  goToEventDetail(e) {
    const eventId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/event-detail/event-detail?id=${eventId}`
    })
  },

  // 跳转到创建训练页面（仅管理员）
  goToCreateEvent() {
    if (!this.data.isAdmin) {
      app.showError('权限不足')
      return
    }
    
    wx.navigateTo({
      url: '/pages/admin/create-event/create-event'
    })
  },

  // 格式化时间显示
  formatTime(timeStr) {
    const date = new Date(timeStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    
    return `${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'registering': '报名中',
      'finished': '已结束'
    }
    return statusMap[status] || '未知状态'
  }
})
