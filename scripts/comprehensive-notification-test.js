/**
 * 综合通知功能测试脚本
 * 验证通知功能的正确性，包括消息内容、发送成功率、失败处理等
 */

const comprehensiveNotificationTest = {
  // 测试配置
  config: {
    testEventTitle: '综合通知测试训练',
    testUserCount: 5,
    simulateFailureRate: 0.2, // 20%失败率用于测试
    testTimeout: 30000 // 30秒超时
  },

  // 测试数据存储
  testData: {
    event: null,
    users: [],
    registrations: [],
    notifications: []
  },

  // 测试结果统计
  results: {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  },

  // 初始化测试环境
  async initializeTestEnvironment() {
    try {
      console.log('🔧 初始化测试环境...')
      
      const db = wx.cloud.database()
      
      // 创建测试训练
      const testEvent = {
        title: this.config.testEventTitle,
        description: '用于综合测试通知功能的训练活动',
        eventTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6小时后
        location: '综合测试场地',
        maxParticipants: 20,
        creatorId: 'test_creator',
        status: 'active',
        createTime: new Date(),
        isDeleted: false
      }
      
      const eventResult = await db.collection('Events').add({
        data: testEvent
      })
      
      this.testData.event = {
        _id: eventResult._id,
        ...testEvent
      }
      
      // 获取测试用户
      const usersResult = await db.collection('Users').limit(this.config.testUserCount).get()
      if (usersResult.data.length < 2) {
        throw new Error('需要至少2个用户来进行综合测试')
      }
      
      this.testData.users = usersResult.data.slice(0, this.config.testUserCount)
      
      // 创建测试报名记录
      for (const user of this.testData.users) {
        const registration = {
          eventId: this.testData.event._id,
          userId: user._id,
          userOpenid: user._openid,
          status: 'signed_up',
          registrationTime: new Date(),
          updateTime: new Date()
        }
        
        const regResult = await db.collection('Registrations').add({
          data: registration
        })
        
        this.testData.registrations.push({
          _id: regResult._id,
          ...registration
        })
      }
      
      console.log(`✅ 测试环境初始化完成: 1个训练, ${this.testData.users.length}个用户, ${this.testData.registrations.length}个报名`)
      return true
    } catch (error) {
      console.error('❌ 初始化测试环境失败:', error)
      return false
    }
  },

  // 测试1: 通知模板生成
  async testNotificationTemplateGeneration() {
    try {
      console.log('📝 测试通知模板生成...')
      
      const testUser = this.testData.users[0]
      const testOperator = this.testData.users[0]
      
      const result = await wx.cloud.callFunction({
        name: 'notification_service',
        data: {
          action: 'generateNotificationTemplate',
          user: testUser,
          event: this.testData.event,
          operator: testOperator,
          deleteReason: '模板测试删除原因',
          messageType: 'full'
        }
      })
      
      if (!result.result.success) {
        throw new Error(result.result.message)
      }
      
      const notification = result.result.data
      
      // 验证模板内容
      const requiredFields = ['title', 'content', 'type', 'timestamp']
      for (const field of requiredFields) {
        if (!notification[field]) {
          throw new Error(`通知模板缺少必需字段: ${field}`)
        }
      }
      
      // 验证内容包含关键信息
      const content = notification.content
      if (!content.includes(testUser.discName || testUser.realName) ||
          !content.includes(this.testData.event.title) ||
          !content.includes('模板测试删除原因')) {
        throw new Error('通知内容缺少关键信息')
      }
      
      console.log('✅ 通知模板生成测试通过')
      return true
    } catch (error) {
      console.error('❌ 通知模板生成测试失败:', error)
      return false
    }
  },

  // 测试2: 单个通知发送
  async testSingleNotificationSending() {
    try {
      console.log('📤 测试单个通知发送...')
      
      const testUser = this.testData.users[0]
      const testOperator = this.testData.users[1] || this.testData.users[0]
      
      const result = await wx.cloud.callFunction({
        name: 'notification_service',
        data: {
          action: 'sendEventDeletedNotification',
          user: testUser,
          event: this.testData.event,
          operator: testOperator,
          deleteReason: '单个通知测试'
        }
      })
      
      if (!result.result.success) {
        throw new Error(result.result.message)
      }
      
      // 验证返回结果
      if (!result.result.notificationId) {
        throw new Error('未返回通知ID')
      }
      
      // 验证数据库记录
      const db = wx.cloud.database()
      const notificationRecord = await db.collection('Notifications')
        .doc(result.result.notificationId).get()
      
      if (!notificationRecord.data) {
        throw new Error('数据库中未找到通知记录')
      }
      
      this.testData.notifications.push(notificationRecord.data)
      
      console.log('✅ 单个通知发送测试通过')
      return true
    } catch (error) {
      console.error('❌ 单个通知发送测试失败:', error)
      return false
    }
  },

  // 测试3: 批量通知发送
  async testBatchNotificationSending() {
    try {
      console.log('📤📤 测试批量通知发送...')
      
      const testOperator = this.testData.users[0]
      const batchUsers = this.testData.users.slice(1) // 除了第一个用户
      
      const result = await wx.cloud.callFunction({
        name: 'notification_service',
        data: {
          action: 'sendBatchEventDeletedNotifications',
          users: batchUsers,
          event: this.testData.event,
          operator: testOperator,
          deleteReason: '批量通知测试'
        }
      })
      
      if (!result.result.success) {
        throw new Error(result.result.message)
      }
      
      const batchResult = result.result.data
      
      // 验证批量结果
      if (batchResult.total !== batchUsers.length) {
        throw new Error(`批量数量不匹配: 期望${batchUsers.length}, 实际${batchResult.total}`)
      }
      
      if (batchResult.success + batchResult.failed !== batchResult.total) {
        throw new Error('批量结果统计不正确')
      }
      
      console.log(`✅ 批量通知发送测试通过: ${batchResult.success}成功, ${batchResult.failed}失败`)
      return true
    } catch (error) {
      console.error('❌ 批量通知发送测试失败:', error)
      return false
    }
  },

  // 测试4: 通知统计功能
  async testNotificationStats() {
    try {
      console.log('📊 测试通知统计功能...')
      
      const result = await wx.cloud.callFunction({
        name: 'notification_service',
        data: {
          action: 'getNotificationStats',
          timeRange: 1 // 1天内
        }
      })
      
      if (!result.result.success) {
        throw new Error(result.result.message)
      }
      
      const stats = result.result.data
      
      // 验证统计数据结构
      const requiredFields = ['total', 'sent', 'failed', 'pending', 'read', 'successRate', 'readRate']
      for (const field of requiredFields) {
        if (stats[field] === undefined) {
          throw new Error(`统计数据缺少字段: ${field}`)
        }
      }
      
      // 验证数据逻辑
      if (stats.total !== stats.sent + stats.failed + stats.pending + stats.read) {
        throw new Error('统计数据总数不匹配')
      }
      
      console.log('✅ 通知统计功能测试通过')
      console.log('📈 统计结果:', stats)
      return true
    } catch (error) {
      console.error('❌ 通知统计功能测试失败:', error)
      return false
    }
  },

  // 测试5: 失败处理机制
  async testFailureHandling() {
    try {
      console.log('🔄 测试失败处理机制...')
      
      // 这里需要模拟一些失败的通知记录
      const db = wx.cloud.database()
      
      // 创建一个模拟失败的通知记录
      const failedNotification = {
        userId: this.testData.users[0]._id,
        userOpenid: this.testData.users[0]._openid,
        eventId: this.testData.event._id,
        operatorId: this.testData.users[0]._id,
        type: 'event_deleted',
        title: '测试失败通知',
        content: '这是一个测试失败的通知',
        status: 'failed',
        error: '网络连接超时',
        createTime: new Date(),
        retryCount: 0,
        metadata: {
          eventTitle: this.testData.event.title,
          eventTime: this.testData.event.eventTime,
          deleteReason: '失败测试'
        }
      }
      
      const failedResult = await db.collection('Notifications').add({
        data: failedNotification
      })
      
      // 测试自动处理失败通知
      const processResult = await wx.cloud.callFunction({
        name: 'notification_service',
        data: {
          action: 'processFailedNotifications',
          maxAge: 24 * 60 * 60 * 1000, // 24小时
          maxRetries: 3
        }
      })
      
      if (!processResult.result.success) {
        throw new Error(processResult.result.message)
      }
      
      console.log('✅ 失败处理机制测试通过')
      console.log('🔄 处理结果:', processResult.result.data)
      return true
    } catch (error) {
      console.error('❌ 失败处理机制测试失败:', error)
      return false
    }
  },

  // 测试6: 完整删除流程集成
  async testCompleteDeleteIntegration() {
    try {
      console.log('🗑️ 测试完整删除流程集成...')
      
      // 确保有管理员权限
      const db = wx.cloud.database()
      const testUser = this.testData.users[0]
      
      // 临时提升权限
      await db.collection('Users').doc(testUser._id).update({
        data: { role: 'admin' }
      })
      
      // 执行删除操作
      const deleteResult = await wx.cloud.callFunction({
        name: 'event_service',
        data: {
          action: 'delete',
          eventId: this.testData.event._id,
          deleteReason: '完整流程集成测试'
        }
      })
      
      if (!deleteResult.result.success) {
        throw new Error(deleteResult.result.message)
      }
      
      // 验证删除结果包含通知信息
      const deleteData = deleteResult.result.data
      if (!deleteData.notificationRequired || !deleteData.notificationResult) {
        throw new Error('删除结果缺少通知信息')
      }
      
      console.log('✅ 完整删除流程集成测试通过')
      console.log('🔗 集成结果:', deleteData.notificationResult)
      return true
    } catch (error) {
      console.error('❌ 完整删除流程集成测试失败:', error)
      return false
    }
  },

  // 清理测试数据
  async cleanupTestData() {
    try {
      console.log('🧹 清理测试数据...')
      
      const db = wx.cloud.database()
      
      // 清理测试报名记录
      for (const reg of this.testData.registrations) {
        try {
          await db.collection('Registrations').doc(reg._id).remove()
        } catch (error) {
          console.log(`清理报名记录${reg._id}失败:`, error.message)
        }
      }
      
      // 清理测试训练（可能已被删除）
      if (this.testData.event) {
        try {
          await db.collection('Events').doc(this.testData.event._id).remove()
        } catch (error) {
          console.log('测试训练可能已被删除')
        }
      }
      
      // 清理测试通知记录
      const notificationsResult = await db.collection('Notifications').where({
        'metadata.eventTitle': this.config.testEventTitle
      }).get()
      
      for (const notification of notificationsResult.data) {
        await db.collection('Notifications').doc(notification._id).remove()
      }
      
      // 重置用户权限
      for (const user of this.testData.users) {
        try {
          await db.collection('Users').doc(user._id).update({
            data: { role: user.role || 'user' }
          })
        } catch (error) {
          console.log(`重置用户${user._id}权限失败:`, error.message)
        }
      }
      
      console.log('✅ 测试数据清理完成')
      return true
    } catch (error) {
      console.error('❌ 清理测试数据失败:', error)
      return false
    }
  },

  // 运行单个测试
  async runSingleTest(testName, testFunction) {
    this.results.total++
    
    try {
      const success = await testFunction.call(this)
      if (success) {
        this.results.passed++
        this.results.details.push({
          name: testName,
          status: 'PASSED',
          message: '测试通过'
        })
      } else {
        this.results.failed++
        this.results.details.push({
          name: testName,
          status: 'FAILED',
          message: '测试失败'
        })
      }
    } catch (error) {
      this.results.failed++
      this.results.details.push({
        name: testName,
        status: 'ERROR',
        message: error.message
      })
    }
  },

  // 运行完整测试套件
  async runCompleteTestSuite() {
    console.log('🚀 开始综合通知功能测试...')
    console.log('=====================================')
    
    // 重置结果
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      details: []
    }
    
    // 初始化测试环境
    const initSuccess = await this.initializeTestEnvironment()
    if (!initSuccess) {
      console.log('❌ 测试环境初始化失败，终止测试')
      return false
    }
    
    // 定义测试用例
    const testCases = [
      { name: '通知模板生成', fn: this.testNotificationTemplateGeneration },
      { name: '单个通知发送', fn: this.testSingleNotificationSending },
      { name: '批量通知发送', fn: this.testBatchNotificationSending },
      { name: '通知统计功能', fn: this.testNotificationStats },
      { name: '失败处理机制', fn: this.testFailureHandling },
      { name: '完整删除流程集成', fn: this.testCompleteDeleteIntegration }
    ]
    
    // 执行测试用例
    for (const testCase of testCases) {
      console.log(`\n📋 执行测试: ${testCase.name}`)
      await this.runSingleTest(testCase.name, testCase.fn)
      
      // 测试间延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // 清理测试数据
    await this.cleanupTestData()
    
    // 输出测试结果
    console.log('\n=====================================')
    console.log('🎯 测试结果汇总:')
    console.log(`总测试数: ${this.results.total}`)
    console.log(`通过: ${this.results.passed}`)
    console.log(`失败: ${this.results.failed}`)
    console.log(`成功率: ${(this.results.passed / this.results.total * 100).toFixed(1)}%`)
    
    console.log('\n📋 详细结果:')
    this.results.details.forEach((detail, index) => {
      const icon = detail.status === 'PASSED' ? '✅' : '❌'
      console.log(`${index + 1}. ${icon} ${detail.name}: ${detail.message}`)
    })
    
    const allPassed = this.results.failed === 0
    if (allPassed) {
      console.log('\n🎉 所有通知功能测试通过！')
    } else {
      console.log('\n⚠️ 部分测试失败，请检查错误信息')
    }
    
    return allPassed
  }
}

// 使用方法：
// 1. 在微信开发者工具控制台中复制粘贴此脚本
// 2. 运行完整测试: comprehensiveNotificationTest.runCompleteTestSuite()
// 3. 或者运行单个测试，如: comprehensiveNotificationTest.testNotificationTemplateGeneration()

console.log('📦 综合通知功能测试脚本已加载')
console.log('💡 运行 comprehensiveNotificationTest.runCompleteTestSuite() 开始完整测试')
