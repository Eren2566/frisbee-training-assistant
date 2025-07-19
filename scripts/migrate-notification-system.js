/**
 * 通知系统数据库迁移脚本
 * 创建Notifications集合并设置索引
 */

// 在微信开发者工具控制台中运行此脚本

const migrateNotificationSystem = {
  // 创建Notifications集合和索引
  async createNotificationsCollection() {
    try {
      console.log('开始创建Notifications集合...')
      
      // 创建示例通知记录以初始化集合
      const sampleNotification = {
        userId: 'sample_user_id',
        userOpenid: 'sample_openid',
        eventId: 'sample_event_id',
        operatorId: 'sample_operator_id',
        type: 'event_deleted',
        title: '训练活动取消通知',
        content: '这是一个示例通知',
        status: 'sent', // pending, sent, failed, read
        createTime: new Date(),
        sendTime: new Date(),
        readTime: null,
        metadata: {
          eventTitle: '示例训练',
          eventTime: new Date(),
          deleteReason: '示例原因'
        },
        retryCount: 0,
        lastRetryTime: null,
        error: null
      }
      
      const result = await wx.cloud.callFunction({
        name: 'system_service',
        data: {
          action: 'createCollection',
          collectionName: 'Notifications',
          sampleData: sampleNotification
        }
      })
      
      if (result.result.success) {
        console.log('✅ Notifications集合创建成功')
        
        // 删除示例数据
        await this.cleanupSampleData()
        
        return true
      } else {
        console.error('❌ Notifications集合创建失败:', result.result.message)
        return false
      }
    } catch (error) {
      console.error('❌ 创建Notifications集合时发生错误:', error)
      return false
    }
  },
  
  // 清理示例数据
  async cleanupSampleData() {
    try {
      const db = wx.cloud.database()
      await db.collection('Notifications').where({
        userId: 'sample_user_id'
      }).remove()
      console.log('✅ 示例数据清理完成')
    } catch (error) {
      console.log('⚠️ 清理示例数据失败:', error)
    }
  },
  
  // 更新系统配置启用通知功能
  async enableNotificationFeature() {
    try {
      console.log('启用通知功能...')
      
      const result = await wx.cloud.callFunction({
        name: 'system_service',
        data: {
          action: 'updateSystemConfig',
          config: {
            features: {
              notifications: true
            }
          }
        }
      })
      
      if (result.result.success) {
        console.log('✅ 通知功能已启用')
        return true
      } else {
        console.error('❌ 启用通知功能失败:', result.result.message)
        return false
      }
    } catch (error) {
      console.error('❌ 启用通知功能时发生错误:', error)
      return false
    }
  },
  
  // 创建通知相关索引
  async createNotificationIndexes() {
    try {
      console.log('创建通知索引...')
      
      // 这里需要在云开发控制台手动创建索引，或者通过云函数API创建
      // 主要索引：
      // 1. userId (用于查询用户的通知)
      // 2. eventId (用于查询特定训练的通知)
      // 3. status (用于查询待发送/失败的通知)
      // 4. createTime (用于按时间排序)
      // 5. type (用于按通知类型查询)
      
      console.log('📝 请在云开发控制台为Notifications集合创建以下索引:')
      console.log('1. userId (单字段索引)')
      console.log('2. eventId (单字段索引)')
      console.log('3. status (单字段索引)')
      console.log('4. createTime (单字段索引，降序)')
      console.log('5. type (单字段索引)')
      console.log('6. userOpenid (单字段索引)')
      console.log('7. 复合索引: userId + status + createTime')
      
      return true
    } catch (error) {
      console.error('❌ 创建索引时发生错误:', error)
      return false
    }
  },
  
  // 测试通知系统
  async testNotificationSystem() {
    try {
      console.log('测试通知系统...')
      
      // 获取一个测试用户和训练
      const db = wx.cloud.database()
      
      const userResult = await db.collection('Users').limit(1).get()
      const eventResult = await db.collection('Events').limit(1).get()
      
      if (userResult.data.length === 0 || eventResult.data.length === 0) {
        console.log('⚠️ 需要至少一个用户和一个训练来测试通知系统')
        return false
      }
      
      const testUser = userResult.data[0]
      const testEvent = eventResult.data[0]
      const testOperator = testUser // 使用同一用户作为操作者
      
      // 测试生成通知模板
      const result = await wx.cloud.callFunction({
        name: 'notification_service',
        data: {
          action: 'generateNotificationTemplate',
          user: testUser,
          event: testEvent,
          operator: testOperator,
          deleteReason: '测试删除原因',
          messageType: 'full'
        }
      })
      
      if (result.result.success) {
        console.log('✅ 通知模板生成测试成功')
        console.log('📄 生成的通知内容:')
        console.log(result.result.data.content)
        return true
      } else {
        console.error('❌ 通知模板生成测试失败:', result.result.message)
        return false
      }
    } catch (error) {
      console.error('❌ 测试通知系统时发生错误:', error)
      return false
    }
  },
  
  // 完整迁移流程
  async runFullMigration() {
    console.log('🚀 开始通知系统迁移...')
    console.log('=====================================')
    
    const steps = [
      { name: '创建Notifications集合', fn: this.createNotificationsCollection },
      { name: '启用通知功能', fn: this.enableNotificationFeature },
      { name: '创建数据库索引', fn: this.createNotificationIndexes },
      { name: '测试通知系统', fn: this.testNotificationSystem }
    ]
    
    let successCount = 0
    
    for (const step of steps) {
      console.log(`\n📋 执行步骤: ${step.name}`)
      try {
        const success = await step.fn.call(this)
        if (success) {
          successCount++
          console.log(`✅ ${step.name} 完成`)
        } else {
          console.log(`❌ ${step.name} 失败`)
        }
      } catch (error) {
        console.error(`❌ ${step.name} 执行出错:`, error)
      }
    }
    
    console.log('\n=====================================')
    console.log(`🎯 迁移完成: ${successCount}/${steps.length} 步骤成功`)
    
    if (successCount === steps.length) {
      console.log('🎉 通知系统迁移全部完成！')
    } else {
      console.log('⚠️ 部分步骤失败，请检查错误信息并手动处理')
    }
    
    return successCount === steps.length
  }
}

// 使用方法：
// 1. 在微信开发者工具控制台中复制粘贴此脚本
// 2. 运行: migrateNotificationSystem.runFullMigration()
// 3. 或者单独运行某个步骤，如: migrateNotificationSystem.createNotificationsCollection()

console.log('📦 通知系统迁移脚本已加载')
console.log('💡 运行 migrateNotificationSystem.runFullMigration() 开始迁移')
