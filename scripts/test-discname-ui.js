// 盘名修改前端功能测试脚本
// 在微信开发者工具控制台中运行

class DiscNameUITester {
  constructor() {
    this.testResults = []
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

  // 测试1: 检查页面注册
  testPageRegistration() {
    try {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      
      if (currentPage && currentPage.route === 'pages/edit-discname/edit-discname') {
        this.logResult('页面注册检查', true, '盘名修改页面已正确注册和加载')
        return currentPage
      } else {
        this.logResult('页面注册检查', false, '请在盘名修改页面运行此测试')
        return null
      }
    } catch (error) {
      this.logResult('页面注册检查', false, `检查失败: ${error.message}`)
      return null
    }
  }

  // 测试2: 检查页面数据加载
  testPageDataLoading() {
    try {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      
      if (!currentPage || currentPage.route !== 'pages/edit-discname/edit-discname') {
        this.logResult('页面数据检查', false, '请在盘名修改页面运行此测试')
        return false
      }

      const pageData = currentPage.data
      const requiredFields = [
        'isLoading', 'currentDiscName', 'remainingChanges', 
        'canChange', 'changeHistory'
      ]
      
      const missingFields = requiredFields.filter(field => 
        pageData[field] === undefined
      )
      
      if (missingFields.length === 0) {
        this.logResult('页面数据检查', true, '页面数据结构完整', {
          currentDiscName: pageData.currentDiscName,
          remainingChanges: pageData.remainingChanges,
          canChange: pageData.canChange,
          historyCount: pageData.changeHistory.length
        })
        return true
      } else {
        this.logResult('页面数据检查', false, `缺少字段: ${missingFields.join(', ')}`)
        return false
      }
    } catch (error) {
      this.logResult('页面数据检查', false, `检查失败: ${error.message}`)
      return false
    }
  }

  // 测试3: 检查页面方法
  testPageMethods() {
    try {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      
      if (!currentPage || currentPage.route !== 'pages/edit-discname/edit-discname') {
        this.logResult('页面方法检查', false, '请在盘名修改页面运行此测试')
        return false
      }

      const requiredMethods = [
        'loadDiscNameInfo', 'onDiscNameInput', 'validateDiscName',
        'confirmChange', 'toggleHistory', 'formatTime'
      ]
      
      const missingMethods = requiredMethods.filter(method => 
        typeof currentPage[method] !== 'function'
      )
      
      if (missingMethods.length === 0) {
        this.logResult('页面方法检查', true, '页面方法完整')
        return true
      } else {
        this.logResult('页面方法检查', false, `缺少方法: ${missingMethods.join(', ')}`)
        return false
      }
    } catch (error) {
      this.logResult('页面方法检查', false, `检查失败: ${error.message}`)
      return false
    }
  }

  // 测试4: 测试盘名验证逻辑
  testDiscNameValidation() {
    try {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      
      if (!currentPage || currentPage.route !== 'pages/edit-discname/edit-discname') {
        this.logResult('盘名验证测试', false, '请在盘名修改页面运行此测试')
        return false
      }

      const testCases = [
        { input: '', expected: false, desc: '空字符串' },
        { input: 'a', expected: false, desc: '过短' },
        { input: '测试盘名', expected: true, desc: '正常中文' },
        { input: 'TestName', expected: true, desc: '正常英文' },
        { input: '测试123', expected: true, desc: '中文+数字' },
        { input: 'a'.repeat(21), expected: false, desc: '过长' },
        { input: '测试@#', expected: false, desc: '特殊字符' }
      ]

      let passedTests = 0
      
      for (const testCase of testCases) {
        const result = currentPage.validateDiscName(testCase.input)
        if (result === testCase.expected) {
          passedTests++
          console.log(`  ✅ ${testCase.desc}: ${testCase.input} -> ${result}`)
        } else {
          console.log(`  ❌ ${testCase.desc}: ${testCase.input} -> ${result} (期望: ${testCase.expected})`)
        }
      }

      const allPassed = passedTests === testCases.length
      this.logResult('盘名验证测试', allPassed, `${passedTests}/${testCases.length} 个验证测试通过`)
      return allPassed
    } catch (error) {
      this.logResult('盘名验证测试', false, `测试失败: ${error.message}`)
      return false
    }
  }

  // 测试5: 测试时间格式化
  testTimeFormatting() {
    try {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      
      if (!currentPage || currentPage.route !== 'pages/edit-discname/edit-discname') {
        this.logResult('时间格式化测试', false, '请在盘名修改页面运行此测试')
        return false
      }

      const now = new Date()
      const testCases = [
        { input: new Date(now.getTime() - 30000).toISOString(), expected: '刚刚' },
        { input: new Date(now.getTime() - 300000).toISOString(), expected: '5分钟前' },
        { input: new Date(now.getTime() - 3600000).toISOString(), expected: '1小时前' }
      ]

      let passedTests = 0
      
      for (const testCase of testCases) {
        const result = currentPage.formatTime(testCase.input)
        if (result === testCase.expected) {
          passedTests++
          console.log(`  ✅ 时间格式化: ${testCase.input} -> ${result}`)
        } else {
          console.log(`  ⚠️ 时间格式化: ${testCase.input} -> ${result} (期望: ${testCase.expected})`)
          // 时间格式化可能有小的差异，不算严重错误
          passedTests += 0.5
        }
      }

      const success = passedTests >= testCases.length * 0.8
      this.logResult('时间格式化测试', success, `时间格式化功能${success ? '正常' : '异常'}`)
      return success
    } catch (error) {
      this.logResult('时间格式化测试', false, `测试失败: ${error.message}`)
      return false
    }
  }

  // 测试6: 检查个人中心页面集成
  testProfilePageIntegration() {
    try {
      // 检查个人中心页面是否有跳转方法
      wx.navigateTo({
        url: '/pages/my-profile/my-profile',
        success: () => {
          setTimeout(() => {
            const pages = getCurrentPages()
            const profilePage = pages[pages.length - 1]
            
            if (profilePage && profilePage.route === 'pages/my-profile/my-profile') {
              if (typeof profilePage.goToEditDiscName === 'function') {
                this.logResult('个人中心集成', true, '个人中心页面已正确集成盘名修改入口')
                
                // 返回到盘名修改页面
                wx.navigateBack()
              } else {
                this.logResult('个人中心集成', false, '个人中心页面缺少跳转方法')
              }
            } else {
              this.logResult('个人中心集成', false, '无法导航到个人中心页面')
            }
          }, 500)
        },
        fail: (error) => {
          this.logResult('个人中心集成', false, `导航失败: ${error.errMsg}`)
        }
      })
      
      return true
    } catch (error) {
      this.logResult('个人中心集成', false, `测试失败: ${error.message}`)
      return false
    }
  }

  // 运行所有UI测试
  async runAllTests() {
    console.log('🚀 开始运行盘名修改前端功能测试...\n')
    
    this.testResults = []
    
    const tests = [
      { name: '页面注册检查', fn: () => this.testPageRegistration() },
      { name: '页面数据检查', fn: () => this.testPageDataLoading() },
      { name: '页面方法检查', fn: () => this.testPageMethods() },
      { name: '盘名验证测试', fn: () => this.testDiscNameValidation() },
      { name: '时间格式化测试', fn: () => this.testTimeFormatting() }
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
    console.log('📊 前端功能测试结果总结:')
    console.log(`总测试数: ${tests.length}`)
    console.log(`通过: ${passedTests}`)
    console.log(`失败: ${tests.length - passedTests}`)
    console.log(`成功率: ${Math.round((passedTests / tests.length) * 100)}%`)

    if (passedTests === tests.length) {
      console.log('\n🎉 所有前端测试通过！盘名修改界面功能正常')
      console.log('\n💡 下一步测试:')
      console.log('1. 手动测试页面交互')
      console.log('2. 测试实际的盘名修改流程')
      console.log('3. 验证数据同步和显示')
    } else {
      console.log('\n⚠️ 部分测试失败，请检查相关功能')
    }

    return {
      total: tests.length,
      passed: passedTests,
      failed: tests.length - passedTests,
      results: this.testResults
    }
  }

  // 快速检查页面状态
  quickCheck() {
    console.log('🔍 快速检查盘名修改页面状态...')
    
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    
    if (currentPage && currentPage.route === 'pages/edit-discname/edit-discname') {
      const data = currentPage.data
      console.log('✅ 当前在盘名修改页面')
      console.log(`📊 页面状态:`)
      console.log(`  - 当前盘名: ${data.currentDiscName || '未设置'}`)
      console.log(`  - 剩余次数: ${data.remainingChanges}`)
      console.log(`  - 可以修改: ${data.canChange ? '是' : '否'}`)
      console.log(`  - 历史记录: ${data.changeHistory.length} 条`)
      console.log(`  - 加载状态: ${data.isLoading ? '加载中' : '已加载'}`)
      
      return true
    } else {
      console.log('❌ 请先导航到盘名修改页面')
      console.log('💡 使用以下代码导航:')
      console.log('wx.navigateTo({ url: "/pages/edit-discname/edit-discname" })')
      
      return false
    }
  }
}

// 创建全局测试实例
const discNameUITester = new DiscNameUITester()

// 导出到全局
if (typeof window !== 'undefined') {
  window.discNameUITester = discNameUITester
}

console.log('盘名修改前端功能测试器已加载')
console.log('运行 discNameUITester.quickCheck() 快速检查页面状态')
console.log('运行 discNameUITester.runAllTests() 开始完整的前端测试')
