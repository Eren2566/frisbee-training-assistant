// pages/index/index.js
const app = getApp()
const { getUserDisplayName, getUserRoleText } = require('../../utils/userUtils.js')
const { eventService, registrationService } = require('../../services/api.js')

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    nextEvent: null,
    userEventStatus: null,
    registrationCount: 0,
    countdownText: '',
    isLoading: true
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
    if (this.data.isLoggedIn) {
      this.loadTrainingData()
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
      app.globalData.userInfo = userInfo
      app.globalData.isLoggedIn = true
      // 登录后加载训练数据
      this.loadTrainingData()
    } else {
      this.setData({
        isLoggedIn: false,
        isLoading: false
      })
      app.globalData.isLoggedIn = false
    }
  },

  // 加载训练数据
  async loadTrainingData() {
    try {
      this.setData({ isLoading: true })

      // 获取训练列表
      const events = await eventService.getEventList()

      // 找到下一次训练（未来的训练且状态为报名中）
      const now = new Date()
      const futureEvents = events.filter(event =>
        new Date(event.eventTime) > now && event.status === 'registering'
      )

      if (futureEvents.length > 0) {
        // 按时间排序，取最近的一次
        futureEvents.sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime))
        const nextEvent = futureEvents[0]

        // 获取报名列表
        const registrations = await registrationService.getRegistrationList(nextEvent._id)
        const signedUpCount = registrations.filter(reg => reg.status === 'signed_up').length

        // 获取用户状态
        const userStatus = await registrationService.getUserEventStatus(nextEvent._id)

        // 格式化时间显示
        const formattedEvent = {
          ...nextEvent,
          eventTime: this.formatDateTime(nextEvent.eventTime)
        }

        this.setData({
          nextEvent: formattedEvent,
          userEventStatus: userStatus,
          registrationCount: signedUpCount
        })

        // 开始倒计时
        this.startCountdown()
      } else {
        this.setData({
          nextEvent: null,
          userEventStatus: null,
          registrationCount: 0
        })
      }
    } catch (error) {
      console.error('加载训练数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 开始倒计时
  startCountdown() {
    if (!this.data.nextEvent) return

    const updateCountdown = () => {
      const now = new Date()
      const eventTime = new Date(this.data.nextEvent.eventTime)
      const diff = eventTime - now

      if (diff <= 0) {
        this.setData({ countdownText: '训练已开始' })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      let countdownText = ''
      if (days > 0) {
        countdownText = `${days}天 ${hours}小时 ${minutes}分钟`
      } else if (hours > 0) {
        countdownText = `${hours}小时 ${minutes}分钟`
      } else {
        countdownText = `${minutes}分钟`
      }

      this.setData({ countdownText })
    }

    // 立即更新一次
    updateCountdown()

    // 每分钟更新一次
    this.countdownTimer = setInterval(updateCountdown, 60000)
  },

  // 页面卸载时清除定时器
  onUnload() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
    }
  },

  // 格式化日期时间
  formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr)
    const now = new Date()

    // 获取日期部分
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours()
    const minutes = date.getMinutes()

    // 格式化时间
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

    // 判断是今天、明天还是其他日期
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const eventDate = new Date(year, month - 1, day)
    const diffDays = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return `今天 ${timeStr}`
    } else if (diffDays === 1) {
      return `明天 ${timeStr}`
    } else if (diffDays === 2) {
      return `后天 ${timeStr}`
    } else if (diffDays > 0 && diffDays <= 7) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return `${weekdays[date.getDay()]} ${timeStr}`
    } else {
      return `${month}月${day}日 ${timeStr}`
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
  },

  // 立即报名
  async handleSignUp() {
    if (!this.data.nextEvent) return

    try {
      wx.showLoading({ title: '报名中...' })

      await registrationService.register(this.data.nextEvent._id, 'signed_up')

      wx.showToast({
        title: '报名成功',
        icon: 'success'
      })

      // 重新加载数据
      this.loadTrainingData()
    } catch (error) {
      console.error('报名失败:', error)
      wx.showToast({
        title: '报名失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 申请请假
  async handleLeave() {
    if (!this.data.nextEvent) return

    try {
      wx.showLoading({ title: '请假中...' })

      await registrationService.register(this.data.nextEvent._id, 'leave_requested')

      wx.showToast({
        title: '请假成功',
        icon: 'success'
      })

      // 重新加载数据
      this.loadTrainingData()
    } catch (error) {
      console.error('请假失败:', error)
      wx.showToast({
        title: '请假失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 查看训练详情
  goToEventDetail() {
    if (!this.data.nextEvent) return

    wx.navigateTo({
      url: `/pages/event-detail/event-detail?id=${this.data.nextEvent._id}`
    })
  }
})
