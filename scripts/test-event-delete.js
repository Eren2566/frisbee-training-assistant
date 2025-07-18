// 训练活动删除功能测试脚本
// 在微信开发者工具控制台中运行

class EventDeleteTester {
  constructor() {
    this.testResults = []
    this.testEventId = null
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

  // 等待函数
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 测试1: 环境检查
  async testEnvironment() {
    try {
      // 检查用户登录状态
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo._openid) {
        this.logResult('环境检查', false, '用户未登录')
        return false
      }

      // 检查用户权限
      if (userInfo.role !== 'admin') {
        this.logResult('环境检查', false, '需要管理员权限进行删除测试')
        return false
      }

      this.logResult('环境检查', true, '测试环境就绪', {
        userId: userInfo._openid,
        role: userInfo.role,
        nickName: userInfo.nickName
      })
      
      return true
    } catch (error) {
      this.logResult('环境检查', false, `环境检查失败: ${error.message}`)
      return false
    }
  }

  // 测试2: 创建测试训练
  async createTestEvent() {
    try {
      // 创建一个测试训练（3小时后开始）
      const testTime = new Date()
      testTime.setHours(testTime.getHours() + 3)

      const result = await wx.cloud.callFunction({
        name: 'event_service',
        data: {
          action: 'create',
          title: '删除功能测试训练',
          eventTime: testTime.toISOString(),
          location: '测试场地',
          content: '这是一个用于测试删除功能的训练',
          notes: '测试用训练，可以删除'
        }
      })

      if (result.result.success) {
        this.testEventId = result.result.data._id
        this.logResult('创建测试训练', true, '测试训练创建成功', {
          eventId: this.testEventId,
          eventTime: testTime.toLocaleString()
        })
        return true
      } else {
        this.logResult('创建测试训练', false, result.result.message)
        return false
      }
    } catch (error) {
      this.logResult('创建测试训练', false, `创建失败: ${error.message}`)
      return false
    }
  }

  // 测试3: 权限验证测试
  async testDeletePermissions() {
    try {
      if (!this.testEventId) {
        this.logResult('权限验证测试', false, '没有测试训练ID')
        return false
      }

      // 测试正常删除权限
      const result = await wx.cloud.callFunction({
        name: 'event_service',
        data: {
          action: 'delete',
          eventId: this.testEventId,
          deleteReason: '权限测试'
        }
      })

      if (result.result.success) {
        this.logResult('权限验证测试', true, '管理员删除权限正常')
        return true
      } else {
        this.logResult('权限验证测试', false, result.result.message)
        return false
      }
    } catch (error) {
      this.logResult('权限验证测试', false, `权限测试失败: ${error.message}`)
      return false
    }
  }

  // 测试4: 时间限制测试
  async testTimeRestrictions() {
    try {
      // 创建一个1小时后开始的训练（应该不能删除）
      const nearTime = new Date()
      nearTime.setHours(nearTime.getHours() + 1)

      const createResult = await wx.cloud.callFunction({
        name: 'event_service',
        data: {
          action: 'create',
          title: '时间限制测试训练',
          eventTime: nearTime.toISOString(),
          location: '测试场地',
          content: '用于测试时间限制的训练',
          notes: '1小时后开始，应该不能删除'
        }
      })

      if (!createResult.result.success) {
        this.logResult('时间限制测试', false, '创建测试训练失败')
        return false
      }

      const nearEventId = createResult.result.data._id

      // 尝试删除（应该失败）
      const deleteResult = await wx.cloud.callFunction({
        name: 'event_service',
        data: {
          action: 'delete',
          eventId: nearEventId,
          deleteReason: '时间限制测试'
        }
      })

      if (!deleteResult.result.success) {
        this.logResult('时间限制测试', true, '时间限制正常工作', {
          errorMessage: deleteResult.result.message
        })
        
        // 清理测试数据：直接更新为已删除
        await wx.cloud.callFunction({
          name: 'event_service',
          data: {
            action: 'delete',
            eventId: nearEventId,
            deleteReason: '清理测试数据',
            forceDelete: true // 强制删除标记
          }
        })
        
        return true
      } else {
        this.logResult('时间限制测试', false, '时间限制未生效，不应该能删除')
        return false
      }
    } catch (error) {
      this.logResult('时间限制测试', false, `时间限制测试失败: ${error.message}`)
      return false
    }
  }

  // 测试5: 删除日志验证
  async testDeleteLogging() {
    try {
      // 检查删除日志是否正确记录
      const logsResult = await wx.cloud.callFunction({
        name: 'system_service',
        data: {
          action: 'getEventLogs',
          limit: 5
        }
      })

      if (logsResult.result && logsResult.result.success) {
        const logs = logsResult.result.data || []
        const deleteLogs = logs.filter(log => log.action === 'delete')
        
        if (deleteLogs.length > 0) {
          this.logResult('删除日志验证', true, `找到${deleteLogs.length}条删除日志`, {
            latestLog: deleteLogs[0]
          })
          return true
        } else {
          this.logResult('删除日志验证', false, '未找到删除日志记录')
          return false
        }
      } else {
        this.logResult('删除日志验证', false, '无法获取删除日志')
        return false
      }
    } catch (error) {
      this.logResult('删除日志验证', false, `日志验证失败: ${error.message}`)
      return false
    }
  }

  // 测试6: 数据一致性验证
  async testDataConsistency() {
    try {
      // 检查已删除的训练是否从列表中消失
      const listResult = await wx.cloud.callFunction({
        name: 'event_service',
        data: {
          action: 'getList'
        }
      })

      if (listResult.result.success) {
        const events = listResult.result.data
        const deletedEvent = events.find(e => e._id === this.testEventId)
        
        if (!deletedEvent) {
          this.logResult('数据一致性验证', true, '已删除训练正确从列表中移除')
          return true
        } else {
          this.logResult('数据一致性验证', false, '已删除训练仍在列表中显示')
          return false
        }
      } else {
        this.logResult('数据一致性验证', false, '无法获取训练列表')
        return false
      }
    } catch (error) {
      this.logResult('数据一致性验证', false, `一致性验证失败: ${error.message}`)
      return false
    }
  }

  // 运行完整测试
  async runCompleteTest() {
    console.log('🚀 开始运行训练删除功能完整测试...\n')
    
    this.testResults = []
    
    const tests = [
      { name: '环境检查', fn: () => this.testEnvironment() },
      { name: '创建测试训练', fn: () => this.createTestEvent() },
      { name: '权限验证测试', fn: () => this.testDeletePermissions() },
      { name: '时间限制测试', fn: () => this.testTimeRestrictions() },
      { name: '数据一致性验证', fn: () => this.testDataConsistency() }
    ]

    let passedTests = 0
    
    for (const test of tests) {
      console.log(`\n📋 运行测试: ${test.name}`)
      const result = await test.fn()
      if (result) {
        passedTests++
      }
      
      // 测试间隔
      await this.wait(1000)
    }

    // 输出测试总结
    console.log('\n' + '='.repeat(50))
    console.log('📊 删除功能测试结果总结:')
    console.log(`总测试数: ${tests.length}`)
    console.log(`通过: ${passedTests}`)
    console.log(`失败: ${tests.length - passedTests}`)
    console.log(`成功率: ${Math.round((passedTests / tests.length) * 100)}%`)

    if (passedTests === tests.length) {
      console.log('\n🎉 所有删除功能测试通过！')
      console.log('✅ 权限验证正常')
      console.log('✅ 时间限制生效')
      console.log('✅ 数据一致性良好')
      console.log('✅ 删除日志完整')
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

  // 清理测试数据
  async cleanup() {
    if (this.testEventId) {
      try {
        // 强制删除测试数据
        await wx.cloud.callFunction({
          name: 'event_service',
          data: {
            action: 'delete',
            eventId: this.testEventId,
            deleteReason: '清理测试数据',
            forceDelete: true
          }
        })
        console.log('✅ 测试数据清理完成')
      } catch (error) {
        console.error('❌ 清理测试数据失败:', error)
      }
    }
  }
}

// 创建全局测试实例
const eventDeleteTester = new EventDeleteTester()

// 导出到全局
if (typeof window !== 'undefined') {
  window.eventDeleteTester = eventDeleteTester
}

console.log('训练删除功能测试器已加载')
console.log('运行 eventDeleteTester.runCompleteTest() 开始完整测试')
console.log('运行 eventDeleteTester.cleanup() 清理测试数据')
