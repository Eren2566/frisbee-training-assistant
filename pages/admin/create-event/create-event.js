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
    maxDate: ''  // 最大可选日期
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
          wx.navigateTo({
            url: '/pages/login/login'
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
    this.setData({
      'formData.eventTime': e.detail.value
    })
  },

  // 时间选择
  onTimeChange(e) {
    const date = this.data.formData.eventTime
    const time = e.detail.value
    
    if (date) {
      this.setData({
        'formData.eventTime': `${date} ${time}`
      })
    } else {
      app.showError('请先选择日期')
    }
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

    wx.cloud.callFunction({
      name: 'event_service',
      data: {
        action: 'create',
        ...this.data.formData
      },
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
            }
          })
          app.showSuccess('表单已重置')
        }
      }
    })
  }
})
