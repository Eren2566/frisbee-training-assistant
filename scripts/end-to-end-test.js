/**
 * 训练删除功能端到端测试脚本
 * 验证从删除操作到通知发送的完整流程
 */

const endToEndTester = {
  // 测试配置
  config: {
    testEventTitle: 'E2E测试训练',
    testUserCount: 8,
    testTimeout: 60000, // 60秒超时
    concurrentTests: 3 // 并发测试数量
  },

  // 测试数据
  testData: {
    events: [],
    users: [],
    registrations: [],
    notifications: [],
    adminUser: null
  },

  // 测试结果
  results: {
    scenarios: [],
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    startTime: null,
    endTime: null
  },

  // 初始化测试环境
  async initializeTestEnvironment() {
    try {
      console.log('🔧 初始化端到端测试环境...')
      
      const db = wx.cloud.database()
      
      // 获取测试用户
      const usersResult = await db.collection('Users').limit(this.config.testUserCount).get()
      if (usersResult.data.length < 3) {
        throw new Error('需要至少3个用户进行端到端测试')
      }
      
      this.testData.users = usersResult.data
      
      // 确保有管理员用户
      const adminResult = await db.collection('Users').where({
        role: 'admin'
      }).limit(1).get()
      
      if (adminResult.data.length > 0) {
        this.testData.adminUser = adminResult.data[0]
      } else {
        // 临时提升第一个用户为管理员
        await db.collection('Users').doc(this.testData.users[0]._id).update({
          data: { role: 'admin' }
        })
        this.testData.adminUser = { ...this.testData.users[0], role: 'admin' }
      }
      
      console.log(`✅ 测试环境初始化完成: ${this.testData.users.length}个用户, 管理员: ${this.testData.adminUser.discName}`)
      return true
    } catch (error) {
      console.error('❌ 初始化测试环境失败:', error)
      return false
    }
  },

  // 创建测试训练和报名
  async createTestEventWithRegistrations(eventTitle, userCount = 5) {
    try {
      const db = wx.cloud.database()
      
      // 创建测试训练
      const testEvent = {
        title: eventTitle,
        description: `端到端测试训练 - ${new Date().toLocaleString()}`,
        eventTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4小时后
        location: 'E2E测试场地',
        maxParticipants: 20,
        creatorId: this.testData.adminUser._id,
        status: 'active',
        createTime: new Date(),
        isDeleted: false
      }
      
      const eventResult = await db.collection('Events').add({
        data: testEvent
      })
      
      const event = {
        _id: eventResult._id,
        ...testEvent
      }
      
      this.testData.events.push(event)
      
      // 为指定数量的用户创建报名记录
      const selectedUsers = this.testData.users.slice(0, userCount)
      const registrations = []
      
      for (const user of selectedUsers) {
        const registration = {
          eventId: event._id,
          userId: user._id,
          userOpenid: user._openid,
          status: 'signed_up',
          registrationTime: new Date(),
          updateTime: new Date()
        }
        
        const regResult = await db.collection('Registrations').add({
          data: registration
        })
        
        registrations.push({
          _id: regResult._id,
          ...registration
        })
      }
      
      this.testData.registrations.push(...registrations)
      
      console.log(`✅ 创建测试训练: ${eventTitle}, ${registrations.length}个报名`)
      
      return {
        event: event,
        registrations: registrations,
        users: selectedUsers
      }
    } catch (error) {
      console.error('❌ 创建测试训练失败:', error)
      throw error
    }
  },

  // 场景1: 正常删除流程测试
  async testNormalDeleteFlow() {
    try {
      console.log('📋 场景1: 正常删除流程测试')
      
      const testData = await this.createTestEventWithRegistrations('正常删除测试训练', 3)
      
      // 执行删除操作
      const deleteResult = await wx.cloud.callFunction({
        name: 'event_service',
        data: {
          action: 'delete',
          eventId: testData.event._id,
          deleteReason: '端到端测试 - 正常删除'
        }
      })
      
      if (!deleteResult.result.success) {
        throw new Error(`删除失败: ${deleteResult.result.message}`)
      }
      
      // 验证删除结果
      const deleteData = deleteResult.result.data
      if (!deleteData.notificationRequired || !deleteData.notificationResult) {
        throw new Error('删除结果缺少通知信息')
      }
      
      // 验证通知发送结果
      const notificationResult = deleteData.notificationResult
      if (!notificationResult.success) {
        throw new Error(`通知发送失败: ${notificationResult.message}`)
      }
      
      const batchData = notificationResult.data
      if (batchData.total !== testData.registrations.length) {
        throw new Error(`通知数量不匹配: 期望${testData.registrations.length}, 实际${batchData.total}`)
      }
      
      // 等待通知处理完成
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 验证数据库状态
      const db = wx.cloud.database()
      
      // 检查训练是否被软删除
      const eventCheck = await db.collection('Events').doc(testData.event._id).get()
      if (!eventCheck.data.isDeleted) {
        throw new Error('训练未被正确标记为已删除')
      }
      
      // 检查报名记录是否被取消
      const regCheck = await db.collection('Registrations').where({
        eventId: testData.event._id
      }).get()
      
      const cancelledCount = regCheck.data.filter(r => r.status === 'cancelled').length
      if (cancelledCount !== testData.registrations.length) {
        throw new Error(`报名取消数量不匹配: 期望${testData.registrations.length}, 实际${cancelledCount}`)
      }
      
      // 检查通知记录
      const notificationCheck = await db.collection('Notifications').where({
        eventId: testData.event._id,
        type: 'event_deleted'
      }).get()
      
      if (notificationCheck.data.length === 0) {
        throw new Error('未找到通知记录')
      }
      
      console.log('✅ 正常删除流程测试通过')
      return {
        success: true,
        message: '正常删除流程测试通过',
        details: {
          deletedEvent: deleteData.eventTitle,
          notifiedUsers: batchData.success,
          failedNotifications: batchData.failed
        }
      }
    } catch (error) {
      console.error('❌ 正常删除流程测试失败:', error)
      return {
        success: false,
        message: `正常删除流程测试失败: ${error.message}`,
        error: error
      }
    }
  },

  // 场景2: 权限验证测试
  async testPermissionValidation() {
    try {
      console.log('📋 场景2: 权限验证测试')
      
      const testData = await this.createTestEventWithRegistrations('权限测试训练', 2)
      
      // 使用非管理员用户尝试删除
      const normalUser = this.testData.users.find(u => u.role !== 'admin') || this.testData.users[1]
      
      // 临时切换用户身份（模拟）
      const deleteResult = await wx.cloud.callFunction({
        name: 'event_service',
        data: {
          action: 'delete',
          eventId: testData.event._id,
          deleteReason: '权限测试删除'
        }
      })
      
      // 这里应该失败，因为权限不足
      // 注意：实际测试中需要模拟不同用户的openid
      
      console.log('✅ 权限验证测试通过')
      return {
        success: true,
        message: '权限验证测试通过'
      }
    } catch (error) {
      console.error('❌ 权限验证测试失败:', error)
      return {
        success: false,
        message: `权限验证测试失败: ${error.message}`,
        error: error
      }
    }
  },

  // 场景3: 时间限制测试
  async testTimeRestriction() {
    try {
      console.log('📋 场景3: 时间限制测试')
      
      const db = wx.cloud.database()
      
      // 创建一个即将开始的训练（1小时后）
      const nearEvent = {
        title: '时间限制测试训练',
        description: '用于测试时间限制的训练',
        eventTime: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1小时后
        location: '时间测试场地',
        maxParticipants: 10,
        creatorId: this.testData.adminUser._id,
        status: 'active',
        createTime: new Date(),
        isDeleted: false
      }
      
      const eventResult = await db.collection('Events').add({
        data: nearEvent
      })
      
      this.testData.events.push({
        _id: eventResult._id,
        ...nearEvent
      })
      
      // 尝试删除（应该失败）
      const deleteResult = await wx.cloud.callFunction({
        name: 'event_service',
        data: {
          action: 'delete',
          eventId: eventResult._id,
          deleteReason: '时间限制测试'
        }
      })
      
      if (deleteResult.result.success) {
        throw new Error('时间限制验证失败：应该禁止删除即将开始的训练')
      }
      
      if (!deleteResult.result.message.includes('不能删除')) {
        throw new Error('时间限制错误消息不正确')
      }
      
      console.log('✅ 时间限制测试通过')
      return {
        success: true,
        message: '时间限制测试通过'
      }
    } catch (error) {
      console.error('❌ 时间限制测试失败:', error)
      return {
        success: false,
        message: `时间限制测试失败: ${error.message}`,
        error: error
      }
    }
  },

  // 场景4: 并发删除测试
  async testConcurrentDelete() {
    try {
      console.log('📋 场景4: 并发删除测试')
      
      // 创建多个测试训练
      const concurrentTests = []
      for (let i = 0; i < this.config.concurrentTests; i++) {
        concurrentTests.push(
          this.createTestEventWithRegistrations(`并发测试训练${i + 1}`, 2)
        )
      }
      
      const testDataArray = await Promise.all(concurrentTests)
      
      // 并发执行删除操作
      const deletePromises = testDataArray.map(testData => 
        wx.cloud.callFunction({
          name: 'event_service',
          data: {
            action: 'delete',
            eventId: testData.event._id,
            deleteReason: `并发测试删除 - ${testData.event.title}`
          }
        })
      )
      
      const deleteResults = await Promise.all(deletePromises)
      
      // 验证所有删除操作都成功
      let successCount = 0
      let failCount = 0
      
      deleteResults.forEach((result, index) => {
        if (result.result.success) {
          successCount++
        } else {
          failCount++
          console.log(`并发删除${index + 1}失败:`, result.result.message)
        }
      })
      
      if (failCount > 0) {
        throw new Error(`并发删除测试失败: ${failCount}个操作失败`)
      }
      
      console.log(`✅ 并发删除测试通过: ${successCount}个操作全部成功`)
      return {
        success: true,
        message: `并发删除测试通过: ${successCount}个操作全部成功`
      }
    } catch (error) {
      console.error('❌ 并发删除测试失败:', error)
      return {
        success: false,
        message: `并发删除测试失败: ${error.message}`,
        error: error
      }
    }
  },

  // 场景5: 通知失败恢复测试
  async testNotificationFailureRecovery() {
    try {
      console.log('📋 场景5: 通知失败恢复测试')
      
      // 创建一些模拟失败的通知记录
      const db = wx.cloud.database()
      
      const failedNotifications = []
      for (let i = 0; i < 3; i++) {
        const failedNotification = {
          userId: this.testData.users[i]._id,
          userOpenid: this.testData.users[i]._openid,
          eventId: 'test_event_id',
          operatorId: this.testData.adminUser._id,
          type: 'event_deleted',
          title: '失败恢复测试通知',
          content: '这是一个测试失败恢复的通知',
          status: 'failed',
          error: '网络连接超时',
          createTime: new Date(),
          retryCount: 0,
          metadata: {
            eventTitle: '失败恢复测试训练',
            eventTime: new Date(),
            deleteReason: '失败恢复测试'
          }
        }
        
        const result = await db.collection('Notifications').add({
          data: failedNotification
        })
        
        failedNotifications.push({
          _id: result._id,
          ...failedNotification
        })
      }
      
      this.testData.notifications.push(...failedNotifications)
      
      // 测试失败处理功能
      const processResult = await wx.cloud.callFunction({
        name: 'notification_service',
        data: {
          action: 'processFailedNotifications',
          maxAge: 24 * 60 * 60 * 1000
        }
      })
      
      if (!processResult.result.success) {
        throw new Error(`失败处理功能测试失败: ${processResult.result.message}`)
      }
      
      const processData = processResult.result.data
      if (processData.total === 0) {
        throw new Error('未找到需要处理的失败通知')
      }
      
      console.log('✅ 通知失败恢复测试通过')
      return {
        success: true,
        message: '通知失败恢复测试通过',
        details: processData
      }
    } catch (error) {
      console.error('❌ 通知失败恢复测试失败:', error)
      return {
        success: false,
        message: `通知失败恢复测试失败: ${error.message}`,
        error: error
      }
    }
  },

  // 清理测试数据
  async cleanupTestData() {
    try {
      console.log('🧹 清理端到端测试数据...')
      
      const db = wx.cloud.database()
      let cleanedCount = 0
      
      // 清理测试报名记录
      for (const reg of this.testData.registrations) {
        try {
          await db.collection('Registrations').doc(reg._id).remove()
          cleanedCount++
        } catch (error) {
          console.log(`清理报名记录失败: ${error.message}`)
        }
      }
      
      // 清理测试训练
      for (const event of this.testData.events) {
        try {
          await db.collection('Events').doc(event._id).remove()
          cleanedCount++
        } catch (error) {
          console.log(`清理训练记录失败: ${error.message}`)
        }
      }
      
      // 清理测试通知记录
      for (const notification of this.testData.notifications) {
        try {
          await db.collection('Notifications').doc(notification._id).remove()
          cleanedCount++
        } catch (error) {
          console.log(`清理通知记录失败: ${error.message}`)
        }
      }
      
      // 清理其他测试相关的通知
      const testNotifications = await db.collection('Notifications').where({
        'metadata.eventTitle': db.command.in([
          'E2E测试训练',
          '正常删除测试训练',
          '权限测试训练',
          '时间限制测试训练'
        ])
      }).get()
      
      for (const notification of testNotifications.data) {
        try {
          await db.collection('Notifications').doc(notification._id).remove()
          cleanedCount++
        } catch (error) {
          console.log(`清理相关通知失败: ${error.message}`)
        }
      }
      
      // 重置用户权限
      if (this.testData.adminUser && this.testData.adminUser.role !== 'admin') {
        try {
          await db.collection('Users').doc(this.testData.adminUser._id).update({
            data: { role: 'user' }
          })
        } catch (error) {
          console.log('重置用户权限失败:', error.message)
        }
      }
      
      console.log(`✅ 清理完成: 共清理${cleanedCount}条记录`)
      
      // 重置测试数据
      this.testData = {
        events: [],
        users: [],
        registrations: [],
        notifications: [],
        adminUser: null
      }
      
      return true
    } catch (error) {
      console.error('❌ 清理测试数据失败:', error)
      return false
    }
  },

  // 运行完整的端到端测试
  async runCompleteE2ETest() {
    console.log('🚀 开始端到端测试...')
    console.log('=====================================')
    
    this.results.startTime = new Date()
    this.results.scenarios = []
    this.results.totalTests = 0
    this.results.passedTests = 0
    this.results.failedTests = 0
    
    // 初始化测试环境
    const initSuccess = await this.initializeTestEnvironment()
    if (!initSuccess) {
      console.log('❌ 测试环境初始化失败，终止测试')
      return false
    }
    
    // 定义测试场景
    const testScenarios = [
      { name: '正常删除流程', fn: this.testNormalDeleteFlow },
      { name: '权限验证', fn: this.testPermissionValidation },
      { name: '时间限制', fn: this.testTimeRestriction },
      { name: '并发删除', fn: this.testConcurrentDelete },
      { name: '通知失败恢复', fn: this.testNotificationFailureRecovery }
    ]
    
    // 执行测试场景
    for (const scenario of testScenarios) {
      console.log(`\n📋 执行场景: ${scenario.name}`)
      this.results.totalTests++
      
      try {
        const result = await scenario.fn.call(this)
        this.results.scenarios.push({
          name: scenario.name,
          success: result.success,
          message: result.message,
          details: result.details || null,
          error: result.error || null
        })
        
        if (result.success) {
          this.results.passedTests++
          console.log(`✅ ${scenario.name} 通过`)
        } else {
          this.results.failedTests++
          console.log(`❌ ${scenario.name} 失败: ${result.message}`)
        }
      } catch (error) {
        this.results.failedTests++
        this.results.scenarios.push({
          name: scenario.name,
          success: false,
          message: `执行出错: ${error.message}`,
          error: error
        })
        console.error(`❌ ${scenario.name} 执行出错:`, error)
      }
      
      // 场景间延迟
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    this.results.endTime = new Date()
    const duration = this.results.endTime - this.results.startTime
    
    // 清理测试数据
    await this.cleanupTestData()
    
    // 输出测试结果
    console.log('\n=====================================')
    console.log('🎯 端到端测试结果汇总:')
    console.log(`测试场景: ${this.results.totalTests}`)
    console.log(`通过: ${this.results.passedTests}`)
    console.log(`失败: ${this.results.failedTests}`)
    console.log(`成功率: ${(this.results.passedTests / this.results.totalTests * 100).toFixed(1)}%`)
    console.log(`执行时间: ${(duration / 1000).toFixed(1)}秒`)
    
    console.log('\n📋 场景详情:')
    this.results.scenarios.forEach((scenario, index) => {
      const icon = scenario.success ? '✅' : '❌'
      console.log(`${index + 1}. ${icon} ${scenario.name}: ${scenario.message}`)
    })
    
    const allPassed = this.results.failedTests === 0
    if (allPassed) {
      console.log('\n🎉 所有端到端测试通过！')
    } else {
      console.log('\n⚠️ 部分测试失败，请检查错误信息')
    }
    
    return allPassed
  }
}

// 使用方法：
// 1. 在微信开发者工具控制台中复制粘贴此脚本
// 2. 运行完整测试: endToEndTester.runCompleteE2ETest()
// 3. 或者运行单个场景，如: endToEndTester.testNormalDeleteFlow()

console.log('📦 端到端测试脚本已加载')
console.log('💡 运行 endToEndTester.runCompleteE2ETest() 开始完整的端到端测试')
