// pages/my-profile/my-profile.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    myRegistrations: [],
    isLoading: false,
    displayAvatarUrl: '',
    isUploadingAvatar: false,
    // 盘名修改相关
    showDiscNameModal: false,
    discNameInfo: {
      remainingChanges: 3,
      canChange: true
    },
    newDiscName: '',
    canSubmitDiscName: false,
    isSubmittingDiscName: false,
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
        isLoggedIn: true,
        displayAvatarUrl: this.getDisplayAvatarUrl(userInfo)
      })
    } else {
      this.setData({
        isLoggedIn: false
      })
    }
  },

  // 获取显示的头像URL
  getDisplayAvatarUrl(userInfo) {
    // 优先使用自定义头像，否则使用微信头像
    if (userInfo.customAvatarUrl && userInfo.avatarType === 'custom') {
      return userInfo.customAvatarUrl
    }
    return userInfo.avatarUrl || ''
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
          // 格式化时间显示
          const formattedRegistrations = registrations.map(registration => ({
            ...registration,
            eventInfo: {
              ...registration.eventInfo,
              formattedTime: this.formatTime(registration.eventInfo.eventTime)
            }
          }))

          this.setData({
            myRegistrations: formattedRegistrations
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
  },

  // 跳转到开发工具
  goToDevTools() {
    wx.navigateTo({
      url: '/pages/dev-tools/dev-tools'
    })
  },

  // 显示盘名修改弹窗
  async showEditDiscNameModal() {
    // 先获取盘名修改信息
    try {
      const result = await wx.cloud.callFunction({
        name: 'user_service',
        data: {
          action: 'getDiscNameChangeInfo'
        }
      })

      if (result.result.success) {
        this.setData({
          discNameInfo: result.result.data,
          showDiscNameModal: true,
          newDiscName: ''
        })
      } else {
        wx.showToast({
          title: '获取信息失败',
          icon: 'error'
        })
      }
    } catch (error) {
      console.error('获取盘名信息失败:', error)
      wx.showToast({
        title: '获取信息失败',
        icon: 'error'
      })
    }
  },

  // 隐藏盘名修改弹窗
  hideEditDiscNameModal() {
    this.setData({
      showDiscNameModal: false,
      newDiscName: '',
      canSubmitDiscName: false
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止点击弹窗内容时关闭弹窗
  },

  // 盘名输入处理
  onDiscNameInput(e) {
    const value = e.detail.value.trim()
    this.setData({
      newDiscName: value,
      canSubmitDiscName: this.validateDiscName(value)
    })
  },

  // 验证盘名格式
  validateDiscName(discName) {
    if (!discName || discName.length < 2) {
      return false
    }
    if (discName.length > 20) {
      return false
    }
    // 检查是否与当前盘名相同
    if (discName === this.data.userInfo.discName) {
      return false
    }
    // 简单的字符验证（中文、英文、数字）
    const regex = /^[\u4e00-\u9fa5a-zA-Z0-9]+$/
    return regex.test(discName)
  },

  // 确认修改盘名
  async confirmDiscNameChange() {
    const { newDiscName, isSubmittingDiscName, canSubmitDiscName } = this.data

    if (isSubmittingDiscName || !canSubmitDiscName) {
      return
    }

    this.setData({ isSubmittingDiscName: true })

    try {
      const result = await wx.cloud.callFunction({
        name: 'user_service',
        data: {
          action: 'updateDiscName',
          newDiscName: newDiscName
        }
      })

      if (result.result.success) {
        // 更新本地用户信息
        const updatedUserInfo = {
          ...this.data.userInfo,
          discName: result.result.data.newDiscName
        }

        wx.setStorageSync('userInfo', updatedUserInfo)

        this.setData({
          userInfo: updatedUserInfo,
          discNameInfo: {
            ...this.data.discNameInfo,
            remainingChanges: result.result.data.remainingChanges,
            canChange: result.result.data.remainingChanges > 0
          }
        })

        wx.showToast({
          title: '修改成功',
          icon: 'success'
        })

        // 关闭弹窗
        this.hideEditDiscNameModal()

      } else {
        throw new Error(result.result.message)
      }
    } catch (error) {
      console.error('修改盘名失败:', error)
      wx.showToast({
        title: error.message || '修改失败',
        icon: 'error'
      })
    } finally {
      this.setData({ isSubmittingDiscName: false })
    }
  },

  // 选择头像
  chooseAvatar() {
    if (this.data.isUploadingAvatar) {
      wx.showToast({
        title: '正在上传中，请稍候',
        icon: 'loading',
        duration: 2000
      })
      return
    }

    wx.showActionSheet({
      itemList: ['从相册选择', '拍照'],
      success: (res) => {
        const sourceType = res.tapIndex === 0 ? ['album'] : ['camera']

        wx.chooseImage({
          count: 1,
          sizeType: ['compressed'], // 使用压缩图片
          sourceType: sourceType,
          success: (res) => {
            const tempFilePath = res.tempFilePaths[0]
            this.uploadAvatar(tempFilePath)
          },
          fail: (error) => {
            console.error('选择图片失败:', error)
            wx.showToast({
              title: '选择图片失败',
              icon: 'error'
            })
          }
        })
      }
    })
  },

  // 上传头像
  async uploadAvatar(tempFilePath) {
    this.setData({ isUploadingAvatar: true })

    wx.showLoading({
      title: '上传中...',
      mask: true
    })

    try {
      // 上传到云存储
      const cloudPath = `avatars/${this.data.userInfo._openid}_${Date.now()}.jpg`
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath
      })

      // 更新用户头像信息
      const result = await wx.cloud.callFunction({
        name: 'user_service',
        data: {
          action: 'updateAvatar',
          avatarUrl: uploadResult.fileID,
          avatarType: 'custom'
        }
      })

      if (result.result.success) {
        // 更新本地用户信息
        const updatedUserInfo = {
          ...this.data.userInfo,
          customAvatarUrl: uploadResult.fileID,
          avatarType: 'custom'
        }

        wx.setStorageSync('userInfo', updatedUserInfo)

        this.setData({
          userInfo: updatedUserInfo,
          displayAvatarUrl: uploadResult.fileID
        })

        wx.showToast({
          title: '头像更新成功',
          icon: 'success'
        })
      } else {
        throw new Error(result.result.message)
      }
    } catch (error) {
      console.error('上传头像失败:', error)

      // 根据错误类型提供不同的提示
      let errorMessage = '上传失败，请重试'

      if (error.errCode === -404011) {
        errorMessage = '云存储未开通'
      } else if (error.errCode === -501002) {
        errorMessage = '网络连接失败'
      } else if (error.message && error.message.includes('size')) {
        errorMessage = '图片文件过大'
      } else if (error.message && error.message.includes('format')) {
        errorMessage = '图片格式不支持'
      }

      wx.showToast({
        title: errorMessage,
        icon: 'error',
        duration: 3000
      })
    } finally {
      wx.hideLoading()
      this.setData({ isUploadingAvatar: false })
    }
  }
})
