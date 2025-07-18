// 盘名修改功能测试脚本
// 在微信开发者工具控制台中运行

class DiscNameFunctionTester {
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

  // 测试1: 获取盘名修改信息
  async testGetDiscNameChangeInfo() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user_service',
        data: {
          action: 'getDiscNameChangeInfo'
        }
      })

      if (result.result.success) {
        this.logResult('获取盘名修改信息', true, '成功获取用户盘名信息', result.result.data)
        return result.result.data
      } else {
        this.logResult('获取盘名修改信息', false, result.result.message)
        return null
      }
    } catch (error) {
      this.logResult('获取盘名修改信息', false, `调用失败: ${error.message}`)
      return null
    }
  }

  // 测试2: 测试盘名修改（正常情况）
  async testUpdateDiscName(newDiscName) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user_service',
        data: {
          action: 'updateDiscName',
          newDiscName: newDiscName
        }
      })

      if (result.result.success) {
        this.logResult('盘名修改', true, '盘名修改成功', result.result.data)
        return result.result.data
      } else {
        this.logResult('盘名修改', false, result.result.message, result.result.data)
        return null
      }
    } catch (error) {
      this.logResult('盘名修改', false, `修改失败: ${error.message}`)
      return null
    }
  }

  // 测试3: 测试修改次数限制
  async testChangeLimit() {
    console.log('\n🔄 测试修改次数限制...')
    
    // 先获取当前状态
    const currentInfo = await this.testGetDiscNameChangeInfo()
    if (!currentInfo) {
      this.logResult('修改次数限制测试', false, '无法获取当前状态')
      return false
    }

    const remainingChanges = currentInfo.remainingChanges
    console.log(`当前剩余修改次数: ${remainingChanges}`)

    if (remainingChanges === 0) {
      // 测试已达到限制的情况
      const result = await this.testUpdateDiscName('测试限制盘名')
      if (result === null) {
        this.logResult('修改次数限制测试', true, '正确阻止了超限修改')
        return true
      } else {
        this.logResult('修改次数限制测试', false, '未正确阻止超限修改')
        return false
      }
    } else {
      this.logResult('修改次数限制测试', true, `用户还可以修改 ${remainingChanges} 次`)
      return true
    }
  }

  // 测试4: 测试无效输入
  async testInvalidInputs() {
    console.log('\n🚫 测试无效输入处理...')
    
    const invalidInputs = [
      { input: '', description: '空字符串' },
      { input: null, description: 'null值' },
      { input: undefined, description: 'undefined值' },
      { input: '   ', description: '空白字符' },
      { input: 'a', description: '过短盘名' },
      { input: 'a'.repeat(21), description: '过长盘名' },
      { input: '测试@#$', description: '特殊字符' }
    ]

    let passedTests = 0
    
    for (const testCase of invalidInputs) {
      const result = await wx.cloud.callFunction({
        name: 'user_service',
        data: {
          action: 'updateDiscName',
          newDiscName: testCase.input
        }
      })

      if (!result.result.success) {
        this.logResult(`无效输入测试-${testCase.description}`, true, '正确拒绝了无效输入')
        passedTests++
      } else {
        this.logResult(`无效输入测试-${testCase.description}`, false, '未正确拒绝无效输入')
      }
    }

    const allPassed = passedTests === invalidInputs.length
    this.logResult('无效输入测试总结', allPassed, `${passedTests}/${invalidInputs.length} 个测试通过`)
    return allPassed
  }

  // 测试5: 测试修改历史记录
  async testChangeHistory() {
    console.log('\n📚 测试修改历史记录...')
    
    const info = await this.testGetDiscNameChangeInfo()
    if (!info) {
      this.logResult('修改历史测试', false, '无法获取用户信息')
      return false
    }

    const history = info.changeHistory || []
    
    if (Array.isArray(history)) {
      this.logResult('修改历史测试', true, `找到 ${history.length} 条历史记录`, {
        historyCount: history.length,
        latestChange: history.length > 0 ? history[history.length - 1] : null
      })
      
      // 验证历史记录结构
      if (history.length > 0) {
        const latestRecord = history[history.length - 1]
        const hasRequiredFields = latestRecord.hasOwnProperty('oldName') &&
                                 latestRecord.hasOwnProperty('newName') &&
                                 latestRecord.hasOwnProperty('changeTime')
        
        if (hasRequiredFields) {
          this.logResult('历史记录结构验证', true, '历史记录结构正确')
        } else {
          this.logResult('历史记录结构验证', false, '历史记录结构不完整')
        }
      }
      
      return true
    } else {
      this.logResult('修改历史测试', false, '历史记录格式错误')
      return false
    }
  }

  // 运行所有测试
  async runAllTests() {
    console.log('🚀 开始运行盘名修改功能测试...\n')
    
    this.testResults = []
    
    const tests = [
      { name: '获取盘名修改信息', fn: () => this.testGetDiscNameChangeInfo() },
      { name: '修改历史记录测试', fn: () => this.testChangeHistory() },
      { name: '修改次数限制测试', fn: () => this.testChangeLimit() },
      { name: '无效输入处理测试', fn: () => this.testInvalidInputs() }
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
      console.log('\n🎉 所有测试通过！盘名修改后端功能正常')
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

  // 快速测试修改功能
  async quickTestChange(testDiscName = '测试盘名') {
    console.log(`🔄 快速测试盘名修改功能 (新盘名: ${testDiscName})`)
    
    // 获取当前状态
    const beforeInfo = await this.testGetDiscNameChangeInfo()
    if (!beforeInfo) return false

    console.log(`修改前状态: 当前盘名="${beforeInfo.currentDiscName}", 剩余次数=${beforeInfo.remainingChanges}`)

    if (beforeInfo.remainingChanges === 0) {
      console.log('⚠️ 已达到修改次数限制，无法进行测试修改')
      return true
    }

    // 尝试修改
    const changeResult = await this.testUpdateDiscName(testDiscName)
    if (!changeResult) return false

    // 获取修改后状态
    const afterInfo = await this.testGetDiscNameChangeInfo()
    if (!afterInfo) return false

    console.log(`修改后状态: 当前盘名="${afterInfo.currentDiscName}", 剩余次数=${afterInfo.remainingChanges}`)
    
    return true
  }
}

// 创建全局测试实例
const discNameTester = new DiscNameFunctionTester()

// 导出到全局
if (typeof window !== 'undefined') {
  window.discNameTester = discNameTester
}

console.log('盘名修改功能测试器已加载')
console.log('运行 discNameTester.runAllTests() 开始完整测试')
console.log('运行 discNameTester.quickTestChange("新盘名") 快速测试修改功能')
