// pages/admin/create-event/create-event.js
const app = getApp()

Page({
  data: {
    formData: {
      title: '',
      eventTime: '',
      location: '',
      content: '',
      notes: ''
    },
    isSubmitting: false,
    minDate: '', // 最小可选日期
    maxDate: '', // 最大可选日期
    selectedDate: '', // 选中的日期
    selectedTime: '', // 选中的时间
    formattedDateTime: '' // 格式化显示的日期时间
  },

  onLoad() {
    // 检查管理员权限
    this.checkAdminPermission()
    
    // 设置日期选择范围
    this.setDateRange()
  },

  // 检查管理员权限
  checkAdminPermission() {
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

    if (userInfo.role !== 'admin') {
      wx.showModal({
        title: '权限不足',
        content: '只有管理员可以创建训练',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return
    }
  },

  // 设置日期选择范围
  setDateRange() {
    const now = new Date()
    const minDate = now.toISOString().split('T')[0]
    
    const maxDate = new Date()
    maxDate.setFullYear(now.getFullYear() + 1)
    const maxDateStr = maxDate.toISOString().split('T')[0]

    this.setData({
      minDate: minDate,
      maxDate: maxDateStr
    })
  },

  // 输入框变化处理
  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    
    this.setData({
      [`formData.${field}`]: value
    })
  },

  // 日期选择
  onDateChange(e) {
    const selectedDate = e.detail.value
    this.setData({
      selectedDate: selectedDate
    })

    // 如果已经选择了时间，则更新完整的日期时间
    if (this.data.selectedTime) {
      this.updateDateTime(selectedDate, this.data.selectedTime)
    }
  },

  // 时间选择
  onTimeChange(e) {
    const selectedTime = e.detail.value
    this.setData({
      selectedTime: selectedTime
    })

    if (this.data.selectedDate) {
      this.updateDateTime(this.data.selectedDate, selectedTime)
    } else {
      app.showError('请先选择日期')
    }
  },

  // 更新日期时间显示
  updateDateTime(date, time) {
    // 创建本地时间对象，确保时区正确
    const localDateTime = new Date(`${date}T${time}:00`)

    // 使用本地时间字符串格式，避免时区转换问题
    const eventTime = `${date} ${time}:00`
    const formattedDateTime = this.formatDateTime(date, time)

    this.setData({
      'formData.eventTime': eventTime,
      formattedDateTime: formattedDateTime
    })
  },

  // 格式化日期时间显示
  formatDateTime(dateStr, timeStr) {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()

    // 格式化时间
    const [hours, minutes] = timeStr.split(':')

    return `${year}年${month}月${day}日 ${hours}:${minutes}`
  },

  // 表单验证
  validateForm() {
    const { title, eventTime, location, content } = this.data.formData

    if (!title.trim()) {
      app.showError('请输入训练主题')
      return false
    }

    if (!eventTime) {
      app.showError('请选择训练时间')
      return false
    }

    if (!location.trim()) {
      app.showError('请输入训练地点')
      return false
    }

    if (!content.trim()) {
      app.showError('请输入训练内容')
      return false
    }

    return true
  },

  // 提交表单
  onSubmit() {
    if (!this.validateForm()) {
      return
    }

    if (this.data.isSubmitting) {
      return
    }

    this.setData({
      isSubmitting: true
    })

    app.showLoading('创建中...')

    const requestData = {
      action: 'create',
      ...this.data.formData
    }

    // 如果是测试用户，传递测试用户的openid
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo._openid && userInfo._openid.startsWith('test_')) {
      requestData.testUserId = userInfo._openid
    }

    wx.cloud.callFunction({
      name: 'event_service',
      data: requestData,
      success: (res) => {
        console.log('创建训练成功:', res)
        
        if (res.result.success) {
          app.showSuccess('训练创建成功')
          
          // 延迟跳转，让用户看到成功提示
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        } else {
          app.showError(res.result.message || '创建失败')
        }
      },
      fail: (err) => {
        console.error('创建训练失败:', err)
        app.showError('创建失败，请重试')
      },
      complete: () => {
        app.hideLoading()
        this.setData({
          isSubmitting: false
        })
      }
    })
  },

  // 重置表单
  onReset() {
    wx.showModal({
      title: '确认重置',
      content: '确定要清空所有输入内容吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            formData: {
              title: '',
              eventTime: '',
              location: '',
              content: '',
              notes: ''
            },
            selectedDate: '',
            selectedTime: '',
            formattedDateTime: ''
          })
          app.showSuccess('表单已重置')
        }
      }
    })
  }
})
