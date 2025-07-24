// pages/index/index.js
const app = getApp()
const { getUserDisplayName, getUserRoleText } = require('../../utils/userUtils.js')
const { eventService, registrationService } = require('../../services/api.js')
const { TimeUtils } = require('../../utils/common.js')

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

  // 保存原始事件时间用于倒计时计算
  originalEventTime: null,

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

        // 保存原始时间用于倒计时计算
        this.originalEventTime = nextEvent.eventTime

        // 格式化时间用于显示
        const formattedEvent = {
          ...nextEvent,
          eventTime: TimeUtils.formatEventTime(nextEvent.eventTime)
        }

        this.setData({
          nextEvent: formattedEvent,
          userEventStatus: userStatus,
          registrationCount: signedUpCount
        })

        // 开始倒计时
        this.startCountdown()
      } else {
        this.originalEventTime = null
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
    if (!this.data.nextEvent || !this.originalEventTime) return

    const updateCountdown = () => {
      // 检查原始时间是否存在
      if (!this.originalEventTime) {
        console.warn('原始事件时间不存在，跳过倒计时更新')
        return
      }

      const now = new Date()
      const eventTime = new Date(this.originalEventTime)

      // 检查时间是否有效
      if (isNaN(eventTime.getTime())) {
        console.error('无效的事件时间:', this.originalEventTime)
        return
      }

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

          // 更新页面数据
          this.setData({
            userInfo: userData,
            isLoggedIn: true
          })

          app.showSuccess('登录成功')

          // 根据用户信息完善状态决定跳转路径
          setTimeout(() => {
            if (userData.isInfoCompleted) {
              // 信息已完善，重新加载训练数据
              this.loadTrainingData()
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

      // 提供更详细的错误信息
      let errorMessage = '报名失败'
      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }

      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
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

      // 提供更详细的错误信息
      let errorMessage = '请假失败'
      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }

      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
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
