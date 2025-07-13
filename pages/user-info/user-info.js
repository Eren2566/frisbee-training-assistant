// pages/user-info/user-info.js
const app = getApp()

Page({
  data: {
    formData: {
      gender: '',
      institute: '',
      realName: '',
      discName: '',
      contactInfo: ''
    },
    genderOptions: [
      { value: '男', label: '男' },
      { value: '女', label: '女' }
    ],
    instituteOptions: [
      { value: '卫星互联', label: '卫星互联' },
      { value: '工业软件', label: '工业软件' },
      { value: '集成电路', label: '集成电路' },
      { value: '先进信息', label: '先进信息' },
      { value: '先进视觉', label: '先进视觉' },
      { value: '汽车电子', label: '汽车电子' },
      { value: '其他', label: '其他' }
    ],
    discNameError: '',
    isSubmitting: false
  },

  onLoad() {
    // 检查用户是否已登录
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo._openid) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.redirectTo({
            url: '/pages/login/login'
          })
        }
      })
    }
  },

  // 性别选择
  onGenderChange(e) {
    this.setData({
      'formData.gender': this.data.genderOptions[e.detail.value].value
    })
  },

  // 研究所选择
  onInstituteChange(e) {
    this.setData({
      'formData.institute': this.data.instituteOptions[e.detail.value].value
    })
  },

  // 盘名输入
  onDiscNameInput(e) {
    const discName = e.detail.value
    this.setData({
      'formData.discName': discName
    })
    
    // 实时验证盘名
    this.validateDiscName(discName)
  },

  // 真实姓名输入
  onRealNameInput(e) {
    this.setData({
      'formData.realName': e.detail.value
    })
  },

  // 联系方式输入
  onContactInfoInput(e) {
    this.setData({
      'formData.contactInfo': e.detail.value
    })
  },

  // 验证盘名
  validateDiscName(discName) {
    if (!discName || discName.trim() === '') {
      this.setData({ discNameError: '' })
      return false
    }

    const trimmedName = discName.trim()
    
    // 检查是否包含特殊符号（数字、标点符号、表情符号等）
    const specialCharsRegex = /[0-9\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\uFF00-\uFFEF\u2000-\u206F\u2E00-\u2E7F\u3000-\u303F\uFE30-\uFE4F\uFE50-\uFE6F\u1F600-\u1F64F\u1F300-\u1F5FF\u1F680-\u1F6FF\u1F1E0-\u1F1FF]/
    if (specialCharsRegex.test(trimmedName)) {
      this.setData({ discNameError: '盘名不能包含数字、标点符号或表情符号' })
      return false
    }

    // 检查中文字符数量
    const chineseChars = trimmedName.match(/[\u4e00-\u9fff]/g) || []
    if (chineseChars.length > 4) {
      this.setData({ discNameError: '中文字符不能超过4个字' })
      return false
    }

    // 检查英文字符数量
    const englishChars = trimmedName.match(/[a-zA-Z]/g) || []
    if (englishChars.length > 20) {
      this.setData({ discNameError: '英文字符不能超过20个字母' })
      return false
    }

    // 检查是否只包含中文和英文
    const validCharsRegex = /^[\u4e00-\u9fffa-zA-Z\s]+$/
    if (!validCharsRegex.test(trimmedName)) {
      this.setData({ discNameError: '盘名只能包含中文和英文字符' })
      return false
    }

    this.setData({ discNameError: '' })
    return true
  },

  // 表单验证
  validateForm() {
    const { gender, institute, realName, discName, contactInfo } = this.data.formData

    if (!gender) {
      app.showError('请选择性别')
      return false
    }

    if (!institute) {
      app.showError('请选择研究所')
      return false
    }

    if (!realName || realName.trim() === '') {
      app.showError('请输入真实姓名')
      return false
    }

    if (!discName || discName.trim() === '') {
      app.showError('请输入盘名')
      return false
    }

    if (!this.validateDiscName(discName)) {
      return false
    }

    if (!contactInfo || contactInfo.trim() === '') {
      app.showError('请输入联系方式')
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

    app.showLoading('保存中...')

    wx.cloud.callFunction({
      name: 'user_service',
      data: {
        action: 'completeUserInfo',
        ...this.data.formData
      },
      success: (res) => {
        console.log('完善用户信息成功:', res)
        
        if (res.result.success) {
          const userData = res.result.data
          
          // 更新本地存储的用户信息
          wx.setStorageSync('userInfo', userData)
          
          // 更新全局数据
          app.globalData.userInfo = userData
          
          app.showSuccess('信息保存成功')
          
          // 跳转到首页
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/index/index'
            })
          }, 1500)
        } else {
          app.showError(res.result.message || '保存失败')
        }
      },
      fail: (err) => {
        console.error('完善用户信息失败:', err)
        app.showError('保存失败，请重试')
      },
      complete: () => {
        app.hideLoading()
        this.setData({
          isSubmitting: false
        })
      }
    })
  }
})
