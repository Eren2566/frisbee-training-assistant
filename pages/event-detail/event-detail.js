// pages/event-detail/event-detail.js
const app = getApp()
const { TimeUtils } = require('../../utils/common.js')

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
    isRegistering: false,
    // 删除相关
    canDeleteEvent: false,
    showDeleteModal: false,
    deleteReason: '',
    isDeleting: false
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
          wx.switchTab({
            url: '/pages/index/index'
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
          const eventDetail = {
            ...res.result.data,
            formattedTime: TimeUtils.formatEventDetailTime(res.result.data.eventTime)
          }

          this.setData({
            eventDetail: eventDetail,
            canDeleteEvent: this.checkDeletePermission(eventDetail)
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
    const requestData = {
      action: 'getUserStatus',
      eventId: this.data.eventId
    }

    // 如果是测试用户，传递测试用户的openid
    if (this.data.userInfo && this.data.userInfo._openid && this.data.userInfo._openid.startsWith('test_')) {
      requestData.testUserId = this.data.userInfo._openid
    }

    wx.cloud.callFunction({
      name: 'registration_service',
      data: requestData,
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

    // 检查训练状态，如果是进行中则阻止报名和请假
    if (this.data.eventDetail && this.data.eventDetail.status === 'ongoing') {
      const message = status === 'signed_up' ?
        '训练开始啦，下次记得提前报名哦' :
        '训练已经开始啦！'

      wx.showModal({
        title: '提示',
        content: message,
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }

    this.setData({
      isRegistering: true
    })

    const requestData = {
      action: 'register',
      eventId: this.data.eventId,
      status: status
    }

    // 如果是测试用户，传递测试用户的openid
    if (this.data.userInfo && this.data.userInfo._openid && this.data.userInfo._openid.startsWith('test_')) {
      requestData.testUserId = this.data.userInfo._openid
    }

    wx.cloud.callFunction({
      name: 'registration_service',
      data: requestData,
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
  },

  // 检查删除权限
  checkDeletePermission(eventDetail) {
    const { userInfo } = this.data

    if (!userInfo || !userInfo._openid || !eventDetail) {
      return false
    }

    // 只有管理员或创建者可以删除
    const isAdmin = userInfo.role === 'admin'
    const isCreator = eventDetail.creatorId === userInfo._openid

    if (!isAdmin && !isCreator) {
      return false
    }

    // 检查时间限制：训练开始前2小时不能删除
    const eventTime = new Date(eventDetail.eventTime)
    const now = new Date()
    const timeDiff = eventTime.getTime() - now.getTime()
    const hoursUntilEvent = timeDiff / (1000 * 60 * 60)

    // 如果训练已经开始，不能删除
    if (timeDiff <= 0) {
      return false
    }

    // 如果距离训练开始不足2小时，不能删除
    if (hoursUntilEvent <= 2) {
      return false
    }

    // 如果训练已经结束，不能删除
    if (eventDetail.status === 'finished') {
      return false
    }

    return true
  },

  // 获取删除限制原因
  getDeleteRestrictionReason(eventDetail) {
    const { userInfo } = this.data

    if (!userInfo || !eventDetail) {
      return '无法获取训练信息'
    }

    // 检查权限
    const isAdmin = userInfo.role === 'admin'
    const isCreator = eventDetail.creatorId === userInfo._openid

    if (!isAdmin && !isCreator) {
      return '只有管理员或训练创建者可以删除训练'
    }

    // 检查时间限制
    const eventTime = new Date(eventDetail.eventTime)
    const now = new Date()
    const timeDiff = eventTime.getTime() - now.getTime()
    const hoursUntilEvent = timeDiff / (1000 * 60 * 60)
    const minutesUntilEvent = timeDiff / (1000 * 60)

    if (timeDiff <= 0) {
      return '训练已经开始或结束，不能删除'
    }

    if (hoursUntilEvent <= 2) {
      const remainingTime = minutesUntilEvent > 60 ?
        `${Math.floor(hoursUntilEvent)}小时${Math.floor(minutesUntilEvent % 60)}分钟` :
        `${Math.floor(minutesUntilEvent)}分钟`
      return `距离训练开始仅剩${remainingTime}，不能删除`
    }

    if (eventDetail.status === 'finished') {
      return '训练已结束，不能删除'
    }

    return null
  },

  // 显示删除确认弹窗
  showDeleteConfirm() {
    const { eventDetail } = this.data

    // 再次检查删除权限
    if (!this.checkDeletePermission(eventDetail)) {
      const reason = this.getDeleteRestrictionReason(eventDetail)
      app.showError(reason || '无法删除此训练')
      return
    }

    // 检查是否有用户已出勤
    const { registrationStats } = this.data
    if (registrationStats.present > 0) {
      app.showError(`已有${registrationStats.present}人确认出勤，不能删除训练`)
      return
    }

    this.setData({
      showDeleteModal: true,
      deleteReason: ''
    })
  },

  // 隐藏删除确认弹窗
  hideDeleteModal() {
    this.setData({
      showDeleteModal: false,
      deleteReason: ''
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止点击弹窗内容时关闭弹窗
  },

  // 删除原因输入
  onDeleteReasonInput(e) {
    this.setData({
      deleteReason: e.detail.value
    })
  },

  // 选择预设删除原因
  selectPresetReason(e) {
    const reason = e.currentTarget.dataset.reason
    this.setData({
      deleteReason: reason
    })
  },

  // 确认删除训练
  confirmDeleteEvent() {
    const { eventId, deleteReason, isDeleting } = this.data

    if (isDeleting) {
      return
    }

    this.setData({ isDeleting: true })

    wx.cloud.callFunction({
      name: 'event_service',
      data: {
        action: 'delete',
        eventId: eventId,
        deleteReason: deleteReason || '管理员删除'
      },
      success: (res) => {
        if (res.result.success) {
          const result = res.result.data
          let successMessage = '训练删除成功'

          // 根据删除结果显示详细信息
          if (result.affectedUsers > 0) {
            successMessage += `，已通知${result.affectedUsers}名报名用户`
          }

          app.showSuccess(successMessage)

          // 延迟返回，让用户看到成功提示
          setTimeout(() => {
            wx.navigateBack()
          }, 2000)
        } else {
          app.showError(res.result.message || '删除失败')
        }
      },
      fail: (err) => {
        console.error('删除训练失败:', err)
        app.showError('删除失败，请重试')
      },
      complete: () => {
        this.setData({
          isDeleting: false,
          showDeleteModal: false
        })
      }
    })
  }
})
