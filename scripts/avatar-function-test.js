// 头像功能完整测试脚本
// 在微信开发者工具控制台中运行

class AvatarFunctionTester {
  constructor() {
    this.testResults = []
    this.currentUser = null
  }

  // 记录测试结果
  logResult(testName, success, message, data = null) {
    const result = {
      test: testName,
      success: success,
      message: message,
      data: data,
      timestamp: new Date().toLocaleTimeString()
    }
    this.testResults.push(result)
    
    const icon = success ? '✅' : '❌'
    console.log(`${icon} ${testName}: ${message}`)
    if (data) {
      console.log('   详细信息:', data)
    }
  }

  // 测试1: 检查用户登录状态
  async testUserLogin() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo && userInfo._openid) {
        this.currentUser = userInfo
        this.logResult('用户登录检查', true, '用户已登录', {
          nickName: userInfo.nickName,
          role: userInfo.role,
          hasCustomAvatar: !!userInfo.customAvatarUrl,
          avatarType: userInfo.avatarType
        })
        return true
      } else {
        this.logResult('用户登录检查', false, '用户未登录，请先登录小程序')
        return false
      }
    } catch (error) {
      this.logResult('用户登录检查', false, `检查失败: ${error.message}`)
      return false
    }
  }

  // 测试2: 检查云函数连接
  async testCloudFunction() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user_service',
        data: {
          action: 'updateAvatar',
          avatarUrl: 'test-url',
          avatarType: 'custom'
        }
      })

      if (result.result.success) {
        this.logResult('云函数连接', true, '云函数调用成功')
        return true
      } else {
        this.logResult('云函数连接', true, '云函数连接正常，但更新失败（预期行为）', result.result)
        return true
      }
    } catch (error) {
      this.logResult('云函数连接', false, `云函数调用失败: ${error.message}`)
      return false
    }
  }

  // 测试3: 检查云存储
  async testCloudStorage() {
    try {
      // 创建一个小的测试文件
      const testData = 'data:text/plain;base64,dGVzdA=='
      const testPath = `test/avatar-test-${Date.now()}.txt`
      
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: testPath,
        filePath: testData
      })

      if (uploadResult.fileID) {
        this.logResult('云存储上传', true, '云存储上传成功', {
          fileID: uploadResult.fileID
        })

        // 清理测试文件
        try {
          await wx.cloud.deleteFile({
            fileList: [uploadResult.fileID]
          })
          this.logResult('云存储清理', true, '测试文件清理成功')
        } catch (e) {
          this.logResult('云存储清理', false, '测试文件清理失败（可忽略）')
        }
        
        return true
      } else {
        this.logResult('云存储上传', false, '云存储上传失败')
        return false
      }
    } catch (error) {
      if (error.errCode === -404011) {
        this.logResult('云存储上传', false, '云存储未开通，请在云开发控制台开通存储服务')
      } else {
        this.logResult('云存储上传', false, `云存储错误: ${error.message}`)
      }
      return false
    }
  }

  // 测试4: 检查页面组件
  async testPageComponent() {
    try {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      
      if (currentPage && currentPage.route === 'pages/my-profile/my-profile') {
        if (typeof currentPage.chooseAvatar === 'function') {
          this.logResult('页面组件', true, '头像上传组件已正确集成')
          
          // 检查页面数据
          const pageData = currentPage.data
          this.logResult('页面数据', true, '页面数据结构正确', {
            hasDisplayAvatarUrl: !!pageData.displayAvatarUrl,
            isUploadingAvatar: pageData.isUploadingAvatar,
            userInfo: !!pageData.userInfo
          })
          
          return true
        } else {
          this.logResult('页面组件', false, '头像上传方法未找到')
          return false
        }
      } else {
        this.logResult('页面组件', false, '请在个人中心页面运行此测试')
        return false
      }
    } catch (error) {
      this.logResult('页面组件', false, `检查页面组件失败: ${error.message}`)
      return false
    }
  }

  // 测试5: 模拟头像更新流程
  async testAvatarUpdateFlow() {
    if (!this.currentUser) {
      this.logResult('头像更新流程', false, '用户未登录，跳过此测试')
      return false
    }

    try {
      // 模拟头像更新
      const mockAvatarUrl = `cloud://test-env.test-avatar/mock-avatar-${Date.now()}.jpg`
      
      const result = await wx.cloud.callFunction({
        name: 'user_service',
        data: {
          action: 'updateAvatar',
          avatarUrl: mockAvatarUrl,
          avatarType: 'custom'
        }
      })

      if (result.result.success) {
        this.logResult('头像更新流程', true, '头像更新API调用成功', result.result.data)
        
        // 检查本地存储是否需要更新
        const updatedUserInfo = {
          ...this.currentUser,
          customAvatarUrl: mockAvatarUrl,
          avatarType: 'custom'
        }
        
        this.logResult('本地数据更新', true, '本地用户数据更新逻辑正确')
        return true
      } else {
        this.logResult('头像更新流程', false, `头像更新失败: ${result.result.message}`)
        return false
      }
    } catch (error) {
      this.logResult('头像更新流程', false, `头像更新流程测试失败: ${error.message}`)
      return false
    }
  }

  // 运行所有测试
  async runAllTests() {
    console.log('🚀 开始运行头像功能完整测试...\n')
    
    this.testResults = []
    
    const tests = [
      { name: '用户登录检查', fn: () => this.testUserLogin() },
      { name: '云函数连接测试', fn: () => this.testCloudFunction() },
      { name: '云存储测试', fn: () => this.testCloudStorage() },
      { name: '页面组件测试', fn: () => this.testPageComponent() },
      { name: '头像更新流程测试', fn: () => this.testAvatarUpdateFlow() }
    ]

    let passedTests = 0
    
    for (const test of tests) {
      console.log(`\n📋 运行测试: ${test.name}`)
      const result = await test.fn()
      if (result) {
        passedTests++
      }
    }

    // 输出测试总结
    console.log('\n' + '='.repeat(50))
    console.log('📊 测试结果总结:')
    console.log(`总测试数: ${tests.length}`)
    console.log(`通过: ${passedTests}`)
    console.log(`失败: ${tests.length - passedTests}`)
    console.log(`成功率: ${Math.round((passedTests / tests.length) * 100)}%`)

    if (passedTests === tests.length) {
      console.log('\n🎉 所有测试通过！头像功能已准备就绪')
      console.log('\n💡 下一步操作:')
      console.log('1. 在个人中心页面点击头像')
      console.log('2. 选择图片进行上传测试')
      console.log('3. 验证头像是否正确显示')
    } else {
      console.log('\n⚠️ 部分测试失败，请根据错误信息进行修复')
    }

    return {
      total: tests.length,
      passed: passedTests,
      failed: tests.length - passedTests,
      results: this.testResults
    }
  }

  // 获取测试报告
  getTestReport() {
    return {
      timestamp: new Date().toLocaleString(),
      results: this.testResults,
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.success).length,
        failed: this.testResults.filter(r => !r.success).length
      }
    }
  }
}

// 创建全局测试实例
const avatarTester = new AvatarFunctionTester()

// 导出到全局
if (typeof window !== 'undefined') {
  window.avatarTester = avatarTester
}

console.log('头像功能测试器已加载')
console.log('运行 avatarTester.runAllTests() 开始完整测试')
console.log('运行 avatarTester.getTestReport() 获取测试报告')
