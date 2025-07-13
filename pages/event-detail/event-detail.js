// pages/event-detail/event-detail.js
const app = getApp()

Page({
  data: {
    eventId: '',
    eventDetail: null,
    userInfo: null,
    isAdmin: false,
    userStatus: null, // 用户在此活动的状态
    registrationList: [], // 报名列表（仅管理员可见）
    registrationStats: { // 报名统计数据
      total: 0,
      signedUp: 0,
      leaveRequested: 0,
      present: 0,
      absent: 0
    },
    hasSignedUpUsers: false, // 是否有已报名用户
    isLoading: false,
    isRegistering: false
  },

  onLoad(options) {
    const eventId = options.id
    if (!eventId) {
      app.showError('参数错误')
      wx.navigateBack()
      return
    }

    this.setData({
      eventId: eventId
    })

    this.checkLoginAndLoadData()
  },

  onShow() {
    if (this.data.eventId) {
      this.checkLoginAndLoadData()
    }
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

    this.loadEventDetail()
    this.loadUserStatus()

    // 所有用户都加载报名列表以显示参训人员
    this.loadRegistrationList()
  },

  // 加载训练详情
  loadEventDetail() {
    wx.cloud.callFunction({
      name: 'event_service',
      data: {
        action: 'getDetail',
        eventId: this.data.eventId
      },
      success: (res) => {
        if (res.result.success) {
          this.setData({
            eventDetail: res.result.data
          })
        } else {
          app.showError(res.result.message || '获取训练详情失败')
        }
      },
      fail: (err) => {
        console.error('获取训练详情失败:', err)
        app.showError('获取训练详情失败')
      }
    })
  },

  // 加载用户状态
  loadUserStatus() {
    wx.cloud.callFunction({
      name: 'registration_service',
      data: {
        action: 'getUserStatus',
        eventId: this.data.eventId
      },
      success: (res) => {
        if (res.result.success) {
          this.setData({
            userStatus: res.result.data
          })
        }
      },
      fail: (err) => {
        console.error('获取用户状态失败:', err)
      }
    })
  },

  // 加载报名列表（管理员）
  loadRegistrationList() {
    wx.cloud.callFunction({
      name: 'registration_service',
      data: {
        action: 'getListByEvent',
        eventId: this.data.eventId
      },
      success: (res) => {
        if (res.result.success) {
          const registrationList = res.result.data
          const hasSignedUpUsers = registrationList.some(item => item.status === 'signed_up')
          this.setData({
            registrationList: registrationList,
            registrationStats: this.calculateRegistrationStats(registrationList),
            hasSignedUpUsers: hasSignedUpUsers
          })
        }
      },
      fail: (err) => {
        console.error('获取报名列表失败:', err)
      }
    })
  },

  // 计算报名统计数据
  calculateRegistrationStats(registrationList) {
    const total = registrationList.length
    const signedUp = registrationList.filter(item => item.status === 'signed_up').length
    const leaveRequested = registrationList.filter(item => item.status === 'leave_requested').length
    const present = registrationList.filter(item => item.status === 'present').length
    const absent = registrationList.filter(item => item.status === 'absent').length

    return {
      total,
      signedUp,
      leaveRequested,
      present,
      absent
    }
  },

  // 用户报名
  registerForEvent(e) {
    const status = e.currentTarget.dataset.status
    
    if (this.data.isRegistering) return

    this.setData({
      isRegistering: true
    })

    wx.cloud.callFunction({
      name: 'registration_service',
      data: {
        action: 'register',
        eventId: this.data.eventId,
        status: status
      },
      success: (res) => {
        if (res.result.success) {
          app.showSuccess(res.result.message)
          this.loadUserStatus()
          if (this.data.isAdmin) {
            this.loadRegistrationList()
          }
        } else {
          app.showError(res.result.message || '操作失败')
        }
      },
      fail: (err) => {
        console.error('报名/请假失败:', err)
        app.showError('操作失败')
      },
      complete: () => {
        this.setData({
          isRegistering: false
        })
      }
    })
  },

  // 更新出勤状态（管理员）
  updateAttendance(e) {
    const registrationId = e.currentTarget.dataset.id
    const status = e.currentTarget.dataset.status

    wx.cloud.callFunction({
      name: 'registration_service',
      data: {
        action: 'updateAttendance',
        registrationId: registrationId,
        status: status
      },
      success: (res) => {
        if (res.result.success) {
          app.showSuccess(res.result.message)
          this.loadRegistrationList()
        } else {
          app.showError(res.result.message || '更新失败')
        }
      },
      fail: (err) => {
        console.error('更新出勤状态失败:', err)
        app.showError('更新失败')
      }
    })
  },

  // 格式化时间
  formatTime(timeStr) {
    const date = new Date(timeStr)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    
    return `${year}年${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'signed_up': '已报名',
      'leave_requested': '已请假',
      'present': '已出勤',
      'absent': '缺勤'
    }
    return statusMap[status] || '未知状态'
  }
})
