/**
 * 测试通知功能集成脚本
 * 验证训练删除后的通知发送功能
 */

const notificationIntegrationTester = {
  // 测试数据
  testData: {
    testEvent: null,
    testUsers: [],
    testRegistrations: []
  },

  // 创建测试数据
  async createTestData() {
    try {
      console.log('🔧 创建测试数据...')
      
      const db = wx.cloud.database()
      
      // 创建测试训练
      const testEvent = {
        title: '通知测试训练',
        description: '用于测试通知功能的训练活动',
        eventTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4小时后
        location: '测试场地',
        maxParticipants: 20,
        creatorId: 'test_creator',
        status: 'active',
        createTime: new Date(),
        isDeleted: false
      }
      
      const eventResult = await db.collection('Events').add({
        data: testEvent
      })
      
      this.testData.testEvent = {
        _id: eventResult._id,
        ...testEvent
      }
      
      console.log('✅ 测试训练创建成功:', eventResult._id)
      
      // 获取一些测试用户
      const usersResult = await db.collection('Users').limit(3).get()
      if (usersResult.data.length === 0) {
        throw new Error('需要至少一个用户来测试通知功能')
      }
      
      this.testData.testUsers = usersResult.data
      console.log(`✅ 获取到${usersResult.data.length}个测试用户`)
      
      // 为测试用户创建报名记录
      for (const user of this.testData.testUsers) {
        const registration = {
          eventId: this.testData.testEvent._id,
          userId: user._id,
          userOpenid: user._openid,
          status: 'signed_up',
          registrationTime: new Date(),
          updateTime: new Date()
        }
        
        const regResult = await db.collection('Registrations').add({
          data: registration
        })
        
        this.testData.testRegistrations.push({
          _id: regResult._id,
          ...registration
        })
      }
      
      console.log(`✅ 创建了${this.testData.testRegistrations.length}个测试报名记录`)
      
      return true
    } catch (error) {
      console.error('❌ 创建测试数据失败:', error)
      return false
    }
  },

  // 测试通知模板生成
  async testNotificationTemplate() {
    try {
      console.log('📝 测试通知模板生成...')
      
      if (!this.testData.testEvent || this.testData.testUsers.length === 0) {
        throw new Error('测试数据未准备好')
      }
      
      const testUser = this.testData.testUsers[0]
      const testOperator = this.testData.testUsers[0] // 使用同一用户作为操作者
      
      const result = await wx.cloud.callFunction({
        name: 'notification_service',
        data: {
          action: 'generateNotificationTemplate',
          user: testUser,
          event: this.testData.testEvent,
          operator: testOperator,
          deleteReason: '测试删除原因',
          messageType: 'full'
        }
      })
      
      if (result.result.success) {
        console.log('✅ 通知模板生成成功')
        console.log('📄 生成的通知内容:')
        console.log('---')
        console.log(result.result.data.content)
        console.log('---')
        return true
      } else {
        console.error('❌ 通知模板生成失败:', result.result.message)
        return false
      }
    } catch (error) {
      console.error('❌ 测试通知模板生成时发生错误:', error)
      return false
    }
  },

  // 测试单个通知发送
  async testSingleNotification() {
    try {
      console.log('📤 测试单个通知发送...')
      
      if (!this.testData.testEvent || this.testData.testUsers.length === 0) {
        throw new Error('测试数据未准备好')
      }
      
      const testUser = this.testData.testUsers[0]
      const testOperator = this.testData.testUsers[0]
      
      const result = await wx.cloud.callFunction({
        name: 'notification_service',
        data: {
          action: 'sendEventDeletedNotification',
          user: testUser,
          event: this.testData.testEvent,
          operator: testOperator,
          deleteReason: '单个通知测试'
        }
      })
      
      if (result.result.success) {
        console.log('✅ 单个通知发送成功')
        console.log('📋 通知ID:', result.result.notificationId)
        return true
      } else {
        console.error('❌ 单个通知发送失败:', result.result.message)
        return false
      }
    } catch (error) {
      console.error('❌ 测试单个通知发送时发生错误:', error)
      return false
    }
  },

  // 测试批量通知发送
  async testBatchNotifications() {
    try {
      console.log('📤📤 测试批量通知发送...')
      
      if (!this.testData.testEvent || this.testData.testUsers.length === 0) {
        throw new Error('测试数据未准备好')
      }
      
      const testOperator = this.testData.testUsers[0]
      
      const result = await wx.cloud.callFunction({
        name: 'notification_service',
        data: {
          action: 'sendBatchEventDeletedNotifications',
          users: this.testData.testUsers,
          event: this.testData.testEvent,
          operator: testOperator,
          deleteReason: '批量通知测试'
        }
      })
      
      if (result.result.success) {
        console.log('✅ 批量通知发送成功')
        console.log('📊 发送统计:', result.result.data)
        return true
      } else {
        console.error('❌ 批量通知发送失败:', result.result.message)
        return false
      }
    } catch (error) {
      console.error('❌ 测试批量通知发送时发生错误:', error)
      return false
    }
  },

  // 测试完整的删除流程（包含通知）
  async testDeleteWithNotification() {
    try {
      console.log('🗑️ 测试完整删除流程（包含通知）...')
      
      if (!this.testData.testEvent) {
        throw new Error('测试数据未准备好')
      }
      
      // 获取管理员用户
      const db = wx.cloud.database()
      const adminResult = await db.collection('Users').where({
        role: 'admin'
      }).limit(1).get()
      
      if (adminResult.data.length === 0) {
        console.log('⚠️ 没有管理员用户，使用普通用户测试')
        // 临时提升测试用户权限
        await db.collection('Users').doc(this.testData.testUsers[0]._id).update({
          data: { role: 'admin' }
        })
      }
      
      const result = await wx.cloud.callFunction({
        name: 'event_service',
        data: {
          action: 'delete',
          eventId: this.testData.testEvent._id,
          deleteReason: '完整流程测试删除'
        }
      })
      
      if (result.result.success) {
        console.log('✅ 训练删除成功（包含通知发送）')
        console.log('📊 删除结果:', result.result.data)
        
        if (result.result.data.notificationResult) {
          console.log('📤 通知发送结果:', result.result.data.notificationResult)
        }
        
        return true
      } else {
        console.error('❌ 训练删除失败:', result.result.message)
        return false
      }
    } catch (error) {
      console.error('❌ 测试完整删除流程时发生错误:', error)
      return false
    }
  },

  // 清理测试数据
  async cleanupTestData() {
    try {
      console.log('🧹 清理测试数据...')
      
      const db = wx.cloud.database()
      
      // 清理测试报名记录
      if (this.testData.testRegistrations.length > 0) {
        for (const reg of this.testData.testRegistrations) {
          await db.collection('Registrations').doc(reg._id).remove()
        }
        console.log(`✅ 清理了${this.testData.testRegistrations.length}个测试报名记录`)
      }
      
      // 清理测试训练（如果还存在）
      if (this.testData.testEvent) {
        try {
          await db.collection('Events').doc(this.testData.testEvent._id).remove()
          console.log('✅ 清理了测试训练')
        } catch (error) {
          console.log('ℹ️ 测试训练可能已被删除')
        }
      }
      
      // 清理测试通知记录
      const notificationsResult = await db.collection('Notifications').where({
        'metadata.eventTitle': '通知测试训练'
      }).get()
      
      for (const notification of notificationsResult.data) {
        await db.collection('Notifications').doc(notification._id).remove()
      }
      
      if (notificationsResult.data.length > 0) {
        console.log(`✅ 清理了${notificationsResult.data.length}个测试通知记录`)
      }
      
      // 重置测试数据
      this.testData = {
        testEvent: null,
        testUsers: [],
        testRegistrations: []
      }
      
      console.log('✅ 测试数据清理完成')
      return true
    } catch (error) {
      console.error('❌ 清理测试数据失败:', error)
      return false
    }
  },

  // 运行完整测试
  async runCompleteTest() {
    console.log('🚀 开始通知功能集成测试...')
    console.log('=====================================')
    
    const tests = [
      { name: '创建测试数据', fn: this.createTestData },
      { name: '测试通知模板生成', fn: this.testNotificationTemplate },
      { name: '测试单个通知发送', fn: this.testSingleNotification },
      { name: '测试批量通知发送', fn: this.testBatchNotifications },
      { name: '测试完整删除流程', fn: this.testDeleteWithNotification }
    ]
    
    let successCount = 0
    
    for (const test of tests) {
      console.log(`\n📋 执行测试: ${test.name}`)
      try {
        const success = await test.fn.call(this)
        if (success) {
          successCount++
          console.log(`✅ ${test.name} 通过`)
        } else {
          console.log(`❌ ${test.name} 失败`)
        }
      } catch (error) {
        console.error(`❌ ${test.name} 执行出错:`, error)
      }
      
      // 测试间稍作延迟
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    console.log('\n=====================================')
    console.log(`🎯 测试完成: ${successCount}/${tests.length} 测试通过`)
    
    // 清理测试数据
    await this.cleanupTestData()
    
    if (successCount === tests.length) {
      console.log('🎉 所有通知功能集成测试通过！')
    } else {
      console.log('⚠️ 部分测试失败，请检查错误信息')
    }
    
    return successCount === tests.length
  }
}

// 使用方法：
// 1. 在微信开发者工具控制台中复制粘贴此脚本
// 2. 运行: notificationIntegrationTester.runCompleteTest()
// 3. 或者单独运行某个测试，如: notificationIntegrationTester.testNotificationTemplate()

console.log('📦 通知功能集成测试脚本已加载')
console.log('💡 运行 notificationIntegrationTester.runCompleteTest() 开始测试')
