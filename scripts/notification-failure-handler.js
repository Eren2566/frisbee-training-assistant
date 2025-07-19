/**
 * 通知失败处理和恢复脚本
 * 用于处理通知发送失败的情况，包括重试、日志记录、备用方案等
 */

const notificationFailureHandler = {
  // 配置参数
  config: {
    maxRetries: 3,
    retryDelay: 2000, // 2秒
    batchSize: 5,
    maxFailureAge: 24 * 60 * 60 * 1000 // 24小时
  },

  // 获取失败的通知记录
  async getFailedNotifications(options = {}) {
    try {
      const { 
        eventId = null, 
        maxAge = this.config.maxFailureAge,
        limit = 50 
      } = options
      
      const db = wx.cloud.database()
      const cutoffTime = new Date(Date.now() - maxAge)
      
      let query = db.collection('Notifications').where({
        status: 'failed',
        createTime: db.command.gte(cutoffTime)
      })
      
      if (eventId) {
        query = query.where({
          eventId: eventId
        })
      }
      
      const result = await query
        .orderBy('createTime', 'desc')
        .limit(limit)
        .get()
      
      console.log(`📊 找到${result.data.length}个失败的通知记录`)
      
      return {
        success: true,
        data: result.data,
        count: result.data.length
      }
    } catch (error) {
      console.error('❌ 获取失败通知记录时发生错误:', error)
      return {
        success: false,
        error: error.message,
        data: [],
        count: 0
      }
    }
  },

  // 分析失败原因
  async analyzeFailureReasons(failedNotifications) {
    const analysis = {
      totalFailed: failedNotifications.length,
      reasonStats: {},
      retryableCount: 0,
      nonRetryableCount: 0,
      oldFailures: 0,
      recentFailures: 0
    }
    
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    
    failedNotifications.forEach(notification => {
      const error = notification.error || '未知错误'
      const createTime = new Date(notification.createTime).getTime()
      
      // 统计错误原因
      if (analysis.reasonStats[error]) {
        analysis.reasonStats[error]++
      } else {
        analysis.reasonStats[error] = 1
      }
      
      // 判断是否可重试
      if (this.isRetryableError(error) && notification.retryCount < this.config.maxRetries) {
        analysis.retryableCount++
      } else {
        analysis.nonRetryableCount++
      }
      
      // 按时间分类
      if (createTime > oneHourAgo) {
        analysis.recentFailures++
      } else {
        analysis.oldFailures++
      }
    })
    
    console.log('📈 失败原因分析:')
    console.log(`总失败数: ${analysis.totalFailed}`)
    console.log(`可重试: ${analysis.retryableCount}`)
    console.log(`不可重试: ${analysis.nonRetryableCount}`)
    console.log(`最近1小时: ${analysis.recentFailures}`)
    console.log(`1小时前: ${analysis.oldFailures}`)
    console.log('错误原因统计:', analysis.reasonStats)
    
    return analysis
  },

  // 判断错误是否可重试
  isRetryableError(errorMessage) {
    const retryableKeywords = [
      '网络连接超时',
      '服务暂时不可用',
      '请求超时',
      'timeout',
      'network',
      'connection',
      'temporary'
    ]
    
    const lowerError = errorMessage.toLowerCase()
    return retryableKeywords.some(keyword => lowerError.includes(keyword))
  },

  // 重试失败的通知
  async retryFailedNotifications(failedNotifications) {
    console.log(`🔄 开始重试${failedNotifications.length}个失败的通知...`)
    
    const results = {
      total: failedNotifications.length,
      retried: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      details: []
    }
    
    // 分批处理
    for (let i = 0; i < failedNotifications.length; i += this.config.batchSize) {
      const batch = failedNotifications.slice(i, i + this.config.batchSize)
      
      const batchPromises = batch.map(async (notification) => {
        try {
          // 检查是否可以重试
          if (!this.isRetryableError(notification.error) || 
              notification.retryCount >= this.config.maxRetries) {
            results.skipped++
            results.details.push({
              notificationId: notification._id,
              status: 'skipped',
              reason: '不可重试或已达最大重试次数'
            })
            return
          }
          
          results.retried++
          
          // 获取用户和训练信息进行重试
          const db = wx.cloud.database()
          
          const userResult = await db.collection('Users').doc(notification.userId).get()
          const eventResult = await db.collection('Events').doc(notification.eventId).get()
          const operatorResult = await db.collection('Users').doc(notification.operatorId).get()
          
          if (!userResult.data || !eventResult.data || !operatorResult.data) {
            results.failed++
            results.details.push({
              notificationId: notification._id,
              status: 'failed',
              reason: '相关数据不存在'
            })
            return
          }
          
          // 调用通知服务重试
          const retryResult = await wx.cloud.callFunction({
            name: 'notification_service',
            data: {
              action: 'sendEventDeletedNotification',
              user: userResult.data,
              event: eventResult.data,
              operator: operatorResult.data,
              deleteReason: notification.metadata.deleteReason
            }
          })
          
          if (retryResult.result.success) {
            results.success++
            results.details.push({
              notificationId: notification._id,
              status: 'success',
              newNotificationId: retryResult.result.notificationId
            })
            
            // 删除原来的失败记录
            await db.collection('Notifications').doc(notification._id).remove()
          } else {
            results.failed++
            results.details.push({
              notificationId: notification._id,
              status: 'failed',
              reason: retryResult.result.message
            })
          }
          
        } catch (error) {
          results.failed++
          results.details.push({
            notificationId: notification._id,
            status: 'failed',
            reason: error.message
          })
        }
      })
      
      await Promise.all(batchPromises)
      
      // 批次间延迟
      if (i + this.config.batchSize < failedNotifications.length) {
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay))
      }
    }
    
    console.log('🔄 重试完成:')
    console.log(`总数: ${results.total}`)
    console.log(`已重试: ${results.retried}`)
    console.log(`成功: ${results.success}`)
    console.log(`失败: ${results.failed}`)
    console.log(`跳过: ${results.skipped}`)
    
    return results
  },

  // 清理过期的失败记录
  async cleanupExpiredFailures() {
    try {
      console.log('🧹 清理过期的失败通知记录...')
      
      const db = wx.cloud.database()
      const cutoffTime = new Date(Date.now() - this.config.maxFailureAge)
      
      const expiredResult = await db.collection('Notifications').where({
        status: 'failed',
        createTime: db.command.lt(cutoffTime)
      }).get()
      
      let cleanedCount = 0
      for (const notification of expiredResult.data) {
        await db.collection('Notifications').doc(notification._id).remove()
        cleanedCount++
      }
      
      console.log(`✅ 清理了${cleanedCount}个过期的失败通知记录`)
      
      return {
        success: true,
        cleanedCount: cleanedCount
      }
    } catch (error) {
      console.error('❌ 清理过期失败记录时发生错误:', error)
      return {
        success: false,
        error: error.message,
        cleanedCount: 0
      }
    }
  },

  // 生成失败报告
  async generateFailureReport(options = {}) {
    try {
      console.log('📊 生成通知失败报告...')
      
      const failedResult = await this.getFailedNotifications(options)
      if (!failedResult.success) {
        throw new Error('获取失败通知记录失败')
      }
      
      const analysis = await this.analyzeFailureReasons(failedResult.data)
      
      const report = {
        timestamp: new Date(),
        summary: {
          totalFailed: analysis.totalFailed,
          retryableCount: analysis.retryableCount,
          nonRetryableCount: analysis.nonRetryableCount,
          recentFailures: analysis.recentFailures,
          oldFailures: analysis.oldFailures
        },
        reasonStats: analysis.reasonStats,
        recommendations: this.generateRecommendations(analysis),
        failedNotifications: failedResult.data.map(n => ({
          id: n._id,
          userId: n.userId,
          eventId: n.eventId,
          error: n.error,
          retryCount: n.retryCount,
          createTime: n.createTime,
          canRetry: this.isRetryableError(n.error) && n.retryCount < this.config.maxRetries
        }))
      }
      
      console.log('📋 失败报告生成完成')
      console.log('建议措施:', report.recommendations)
      
      return report
    } catch (error) {
      console.error('❌ 生成失败报告时发生错误:', error)
      return null
    }
  },

  // 生成改进建议
  generateRecommendations(analysis) {
    const recommendations = []
    
    if (analysis.retryableCount > 0) {
      recommendations.push(`有${analysis.retryableCount}个通知可以重试，建议执行重试操作`)
    }
    
    if (analysis.reasonStats['网络连接超时'] > 5) {
      recommendations.push('网络超时错误较多，建议检查网络连接或增加超时时间')
    }
    
    if (analysis.recentFailures > analysis.oldFailures) {
      recommendations.push('最近失败率较高，建议检查系统状态')
    }
    
    if (analysis.nonRetryableCount > analysis.retryableCount) {
      recommendations.push('不可重试错误较多，建议检查代码逻辑或数据完整性')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('系统运行正常，无特殊建议')
    }
    
    return recommendations
  },

  // 运行完整的失败处理流程
  async runFailureHandling(options = {}) {
    console.log('🚀 开始通知失败处理流程...')
    console.log('=====================================')
    
    try {
      // 1. 获取失败通知
      const failedResult = await this.getFailedNotifications(options)
      if (!failedResult.success || failedResult.count === 0) {
        console.log('✅ 没有需要处理的失败通知')
        return true
      }
      
      // 2. 分析失败原因
      const analysis = await this.analyzeFailureReasons(failedResult.data)
      
      // 3. 重试可重试的通知
      const retryableNotifications = failedResult.data.filter(n => 
        this.isRetryableError(n.error) && n.retryCount < this.config.maxRetries
      )
      
      if (retryableNotifications.length > 0) {
        const retryResults = await this.retryFailedNotifications(retryableNotifications)
        console.log(`🔄 重试结果: ${retryResults.success}/${retryResults.retried} 成功`)
      }
      
      // 4. 清理过期记录
      await this.cleanupExpiredFailures()
      
      // 5. 生成报告
      const report = await this.generateFailureReport(options)
      
      console.log('=====================================')
      console.log('🎯 失败处理流程完成')
      
      return true
    } catch (error) {
      console.error('❌ 失败处理流程执行出错:', error)
      return false
    }
  }
}

// 使用方法：
// 1. 在微信开发者工具控制台中复制粘贴此脚本
// 2. 运行完整流程: notificationFailureHandler.runFailureHandling()
// 3. 或者单独执行某个功能，如: notificationFailureHandler.generateFailureReport()

console.log('📦 通知失败处理脚本已加载')
console.log('💡 运行 notificationFailureHandler.runFailureHandling() 开始处理失败通知')
