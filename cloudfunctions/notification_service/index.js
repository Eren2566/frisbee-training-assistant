// 通知服务云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// ==================== 通知消息模板 ====================

/**
 * 训练删除通知消息模板
 */
const NOTIFICATION_TEMPLATES = {
  // 训练删除通知
  EVENT_DELETED: {
    title: '训练活动取消通知',
    template: `亲爱的{userName}：

很抱歉通知您，您报名的训练活动已被取消：

📅 训练名称：{eventTitle}
🕐 原定时间：{eventTime}
📍 训练地点：{eventLocation}
👤 操作人员：{operatorName}

{deleteReasonSection}

如有疑问，请联系管理员。感谢您的理解！

飞盘队训练助手`,
    
    // 短消息版本（用于微信模板消息）
    shortTemplate: `您报名的训练"{eventTitle}"已被取消。{deleteReasonText}如有疑问请联系管理员。`,
    
    // 微信模板消息格式
    wechatTemplate: {
      template_id: 'EVENT_CANCEL_TEMPLATE', // 需要在微信公众平台申请
      data: {
        first: {
          value: '您报名的训练活动已被取消',
          color: '#ff4757'
        },
        keyword1: {
          value: '{eventTitle}',
          color: '#333333'
        },
        keyword2: {
          value: '{eventTime}',
          color: '#333333'
        },
        keyword3: {
          value: '{deleteReason}',
          color: '#666666'
        },
        remark: {
          value: '如有疑问请联系管理员，感谢您的理解！',
          color: '#999999'
        }
      }
    }
  },

  // 批量通知摘要（发送给管理员）
  BATCH_NOTIFICATION_SUMMARY: {
    title: '训练删除通知发送摘要',
    template: `管理员您好：

训练删除通知已发送完成：

📅 训练名称：{eventTitle}
🕐 训练时间：{eventTime}
👤 删除操作：{operatorName}

📊 通知统计：
✅ 发送成功：{successCount} 人
❌ 发送失败：{failedCount} 人
📱 总计用户：{totalCount} 人

{failedUsersSection}

发送时间：{sendTime}

飞盘队训练助手`,
    
    shortTemplate: `训练"{eventTitle}"删除通知已发送：成功{successCount}人，失败{failedCount}人。`
  }
}

// ==================== 消息模板处理函数 ====================

/**
 * 生成训练删除通知消息
 * @param {Object} params 参数对象
 * @param {Object} params.user 用户信息
 * @param {Object} params.event 训练信息
 * @param {Object} params.operator 操作者信息
 * @param {string} params.deleteReason 删除原因
 * @param {string} params.messageType 消息类型 'full' | 'short' | 'wechat'
 */
function generateEventDeletedNotification(params) {
  const { user, event, operator, deleteReason, messageType = 'full' } = params
  
  const template = NOTIFICATION_TEMPLATES.EVENT_DELETED
  
  // 处理删除原因部分
  let deleteReasonSection = ''
  let deleteReasonText = ''
  
  if (deleteReason && deleteReason.trim()) {
    deleteReasonSection = `🔍 取消原因：${deleteReason}\n\n`
    deleteReasonText = `取消原因：${deleteReason}。`
  } else {
    deleteReasonSection = '🔍 取消原因：管理员删除\n\n'
    deleteReasonText = '管理员删除。'
  }
  
  // 格式化时间
  const eventTime = formatDateTime(event.eventTime)
  
  // 根据消息类型选择模板
  let messageTemplate
  switch (messageType) {
    case 'short':
      messageTemplate = template.shortTemplate
      break
    case 'wechat':
      return generateWechatTemplateMessage(params)
    case 'full':
    default:
      messageTemplate = template.template
      break
  }
  
  // 替换模板变量
  const message = messageTemplate
    .replace(/{userName}/g, user.discName || user.realName || '用户')
    .replace(/{eventTitle}/g, event.title)
    .replace(/{eventTime}/g, eventTime)
    .replace(/{eventLocation}/g, event.location || '待定')
    .replace(/{operatorName}/g, operator.discName || operator.realName || '管理员')
    .replace(/{deleteReasonSection}/g, deleteReasonSection)
    .replace(/{deleteReasonText}/g, deleteReasonText)
  
  return {
    title: template.title,
    content: message,
    type: 'event_deleted',
    priority: 'high',
    timestamp: new Date()
  }
}

/**
 * 生成微信模板消息
 */
function generateWechatTemplateMessage(params) {
  const { user, event, operator, deleteReason } = params
  const template = NOTIFICATION_TEMPLATES.EVENT_DELETED.wechatTemplate
  
  const eventTime = formatDateTime(event.eventTime)
  const finalDeleteReason = deleteReason || '管理员删除'
  
  return {
    touser: user.openid,
    template_id: template.template_id,
    data: {
      first: template.data.first,
      keyword1: {
        ...template.data.keyword1,
        value: event.title
      },
      keyword2: {
        ...template.data.keyword2,
        value: eventTime
      },
      keyword3: {
        ...template.data.keyword3,
        value: finalDeleteReason
      },
      remark: template.data.remark
    }
  }
}

/**
 * 生成批量通知摘要消息
 */
function generateBatchNotificationSummary(params) {
  const { event, operator, successCount, failedCount, totalCount, failedUsers, sendTime } = params
  
  const template = NOTIFICATION_TEMPLATES.BATCH_NOTIFICATION_SUMMARY
  const eventTime = formatDateTime(event.eventTime)
  
  // 处理失败用户列表
  let failedUsersSection = ''
  if (failedUsers && failedUsers.length > 0) {
    failedUsersSection = '\n❌ 发送失败用户：\n'
    failedUsers.forEach((user, index) => {
      failedUsersSection += `${index + 1}. ${user.discName || user.realName} (${user.reason || '未知错误'})\n`
    })
  }
  
  const message = template.template
    .replace(/{eventTitle}/g, event.title)
    .replace(/{eventTime}/g, eventTime)
    .replace(/{operatorName}/g, operator.discName || operator.realName || '管理员')
    .replace(/{successCount}/g, successCount)
    .replace(/{failedCount}/g, failedCount)
    .replace(/{totalCount}/g, totalCount)
    .replace(/{failedUsersSection}/g, failedUsersSection)
    .replace(/{sendTime}/g, formatDateTime(sendTime))
  
  return {
    title: template.title,
    content: message,
    type: 'batch_summary',
    priority: 'normal',
    timestamp: new Date()
  }
}

// ==================== 工具函数 ====================

/**
 * 格式化日期时间
 */
function formatDateTime(dateTime) {
  if (!dateTime) return '未知时间'
  
  const date = new Date(dateTime)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekday = weekdays[date.getDay()]
  
  return `${year}年${month}月${day}日 ${weekday} ${hours}:${minutes}`
}

/**
 * 验证通知参数
 */
function validateNotificationParams(params) {
  const { user, event, operator } = params
  
  if (!user || !user.discName) {
    throw new Error('用户信息不完整')
  }
  
  if (!event || !event.title || !event.eventTime) {
    throw new Error('训练信息不完整')
  }
  
  if (!operator) {
    throw new Error('操作者信息不完整')
  }
  
  return true
}

// ==================== 通知发送函数 ====================

/**
 * 发送训练删除通知给单个用户（带重试机制）
 * @param {Object} params 通知参数
 * @param {number} retryCount 重试次数
 */
async function sendEventDeletedNotification(params, retryCount = 0) {
  const maxRetries = 3
  const retryDelay = 1000 * Math.pow(2, retryCount) // 指数退避：1s, 2s, 4s

  try {
    validateNotificationParams(params)

    const { user, event, operator, deleteReason } = params

    // 生成通知消息
    const notification = generateEventDeletedNotification({
      user,
      event,
      operator,
      deleteReason,
      messageType: 'full'
    })

    // 保存通知记录到数据库
    const notificationRecord = {
      userId: user._id,
      userOpenid: user._openid,
      eventId: event._id,
      operatorId: operator._id,
      type: 'event_deleted',
      title: notification.title,
      content: notification.content,
      status: 'pending',
      createTime: new Date(),
      sendTime: null,
      readTime: null,
      retryCount: retryCount,
      lastRetryTime: retryCount > 0 ? new Date() : null,
      error: null,
      metadata: {
        eventTitle: event.title,
        eventTime: event.eventTime,
        deleteReason: deleteReason || '管理员删除'
      }
    }

    const result = await db.collection('Notifications').add({
      data: notificationRecord
    })

    // 模拟通知发送过程（这里可以扩展其他通知方式）
    await simulateNotificationSending(params)

    // 更新通知状态为已发送
    await db.collection('Notifications').doc(result._id).update({
      data: {
        status: 'sent',
        sendTime: new Date()
      }
    })

    return {
      success: true,
      notificationId: result._id,
      message: '通知发送成功',
      retryCount: retryCount
    }

  } catch (error) {
    console.error(`发送通知失败 (重试${retryCount}/${maxRetries}):`, error)

    // 如果还有重试机会且错误是可重试的
    if (retryCount < maxRetries && isRetryableError(error)) {
      console.log(`${retryDelay}ms后进行第${retryCount + 1}次重试...`)

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, retryDelay))
      return await sendEventDeletedNotification(params, retryCount + 1)
    }

    // 记录最终失败的通知
    try {
      await db.collection('Notifications').add({
        data: {
          userId: params.user?._id,
          userOpenid: params.user?._openid,
          eventId: params.event?._id,
          operatorId: params.operator?._id,
          type: 'event_deleted',
          status: 'failed',
          error: error.message,
          createTime: new Date(),
          retryCount: retryCount,
          lastRetryTime: new Date(),
          metadata: {
            eventTitle: params.event?.title,
            eventTime: params.event?.eventTime,
            deleteReason: params.deleteReason || '管理员删除'
          }
        }
      })
    } catch (logError) {
      console.error('记录失败通知失败:', logError)
    }

    return {
      success: false,
      message: `通知发送失败 (已重试${retryCount}次)`,
      error: error.message,
      retryCount: retryCount
    }
  }
}

/**
 * 模拟通知发送过程
 * 在实际应用中，这里会调用微信模板消息API、短信API等
 */
async function simulateNotificationSending(params) {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))

  // 模拟5%的失败率用于测试重试机制
  if (Math.random() < 0.05) {
    throw new Error('网络连接超时')
  }

  // 在实际应用中，这里会是真实的通知发送逻辑
  // 例如：
  // await sendWechatTemplateMessage(params)
  // await sendSMSNotification(params)
  // await sendPushNotification(params)

  return true
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error) {
  const retryableErrors = [
    '网络连接超时',
    '服务暂时不可用',
    '请求超时',
    'timeout',
    'network',
    'connection'
  ]

  const errorMessage = error.message.toLowerCase()
  return retryableErrors.some(keyword => errorMessage.includes(keyword))
}

/**
 * 批量发送训练删除通知
 * @param {Object} params 批量通知参数
 */
async function sendBatchEventDeletedNotifications(params) {
  const { users, event, operator, deleteReason } = params

  const results = {
    total: users.length,
    success: 0,
    failed: 0,
    details: [],
    failedUsers: []
  }

  // 并发发送通知，但限制并发数量避免过载
  const batchSize = 5
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize)

    const batchPromises = batch.map(async (user) => {
      try {
        const result = await sendEventDeletedNotification({
          user,
          event,
          operator,
          deleteReason
        })

        if (result.success) {
          results.success++
          results.details.push({
            userId: user._id,
            userName: user.discName || user.realName,
            status: 'success',
            notificationId: result.notificationId
          })
        } else {
          results.failed++
          results.details.push({
            userId: user._id,
            userName: user.discName || user.realName,
            status: 'failed',
            error: result.error
          })
          results.failedUsers.push({
            ...user,
            reason: result.error
          })
        }
      } catch (error) {
        results.failed++
        results.details.push({
          userId: user._id,
          userName: user.discName || user.realName,
          status: 'failed',
          error: error.message
        })
        results.failedUsers.push({
          ...user,
          reason: error.message
        })
      }
    })

    await Promise.all(batchPromises)

    // 批次间稍作延迟，避免过载
    if (i + batchSize < users.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // 发送批量通知摘要给管理员
  try {
    const summaryNotification = generateBatchNotificationSummary({
      event,
      operator,
      successCount: results.success,
      failedCount: results.failed,
      totalCount: results.total,
      failedUsers: results.failedUsers,
      sendTime: new Date()
    })

    // 保存摘要通知
    await db.collection('Notifications').add({
      data: {
        userId: operator._id,
        userOpenid: operator._openid,
        eventId: event._id,
        operatorId: operator._id,
        type: 'batch_summary',
        title: summaryNotification.title,
        content: summaryNotification.content,
        status: 'sent',
        createTime: new Date(),
        sendTime: new Date(),
        metadata: {
          batchResults: results
        }
      }
    })
  } catch (summaryError) {
    console.error('发送批量通知摘要失败:', summaryError)
  }

  return {
    success: true,
    data: results,
    message: `批量通知发送完成：成功${results.success}人，失败${results.failed}人`
  }
}

// ==================== 通知管理函数 ====================

/**
 * 获取用户通知列表
 */
async function getUserNotifications(params) {
  const { userId, status, limit = 20, skip = 0 } = params

  try {
    let query = db.collection('Notifications').where({
      userId: userId
    })

    if (status) {
      query = query.where({
        status: status
      })
    }

    const result = await query
      .orderBy('createTime', 'desc')
      .limit(limit)
      .skip(skip)
      .get()

    return {
      success: true,
      data: result.data,
      total: result.data.length,
      message: '获取通知列表成功'
    }
  } catch (error) {
    console.error('获取用户通知失败:', error)
    return {
      success: false,
      message: '获取通知列表失败',
      error: error.message
    }
  }
}

/**
 * 标记通知为已读
 */
async function markNotificationAsRead(params) {
  const { notificationId, userId } = params

  try {
    await db.collection('Notifications').doc(notificationId).update({
      data: {
        status: 'read',
        readTime: new Date()
      }
    })

    return {
      success: true,
      message: '通知已标记为已读'
    }
  } catch (error) {
    console.error('标记通知已读失败:', error)
    return {
      success: false,
      message: '标记通知已读失败',
      error: error.message
    }
  }
}

/**
 * 重试失败的通知
 */
async function retryFailedNotifications(params) {
  const { eventId, maxRetries = 3 } = params

  try {
    // 获取失败的通知
    const failedNotifications = await db.collection('Notifications').where({
      eventId: eventId,
      status: 'failed'
    }).get()

    const retryResults = []

    for (const notification of failedNotifications.data) {
      if (notification.retryCount < maxRetries) {
        // 重新构造参数并重试
        const retryParams = {
          user: {
            _id: notification.userId,
            _openid: notification.userOpenid,
            discName: '用户' // 这里需要从用户表获取完整信息
          },
          event: {
            _id: notification.eventId,
            title: notification.metadata.eventTitle,
            eventTime: notification.metadata.eventTime
          },
          operator: {
            _id: notification.operatorId
          },
          deleteReason: notification.metadata.deleteReason
        }

        const result = await sendEventDeletedNotification(retryParams, notification.retryCount)
        retryResults.push({
          notificationId: notification._id,
          success: result.success,
          message: result.message
        })
      }
    }

    return {
      success: true,
      data: retryResults,
      message: `重试完成，处理了${retryResults.length}个失败通知`
    }
  } catch (error) {
    console.error('重试失败通知出错:', error)
    return {
      success: false,
      message: '重试失败通知出错',
      error: error.message
    }
  }
}

/**
 * 自动处理失败的通知（定时任务）
 */
async function processFailedNotifications(params) {
  const { maxAge = 24 * 60 * 60 * 1000, maxRetries = 3 } = params // 默认24小时内的失败通知

  try {
    const cutoffTime = new Date(Date.now() - maxAge)

    // 获取可重试的失败通知
    const failedNotifications = await db.collection('Notifications').where({
      status: 'failed',
      createTime: db.command.gte(cutoffTime),
      retryCount: db.command.lt(maxRetries)
    }).limit(50).get()

    const processResults = {
      total: failedNotifications.data.length,
      success: 0,
      failed: 0,
      details: []
    }

    for (const notification of failedNotifications.data) {
      try {
        // 检查错误是否可重试
        if (!isRetryableError({ message: notification.error })) {
          continue
        }

        // 获取完整的用户、训练、操作者信息
        const [userResult, eventResult, operatorResult] = await Promise.all([
          db.collection('Users').doc(notification.userId).get(),
          db.collection('Events').doc(notification.eventId).get(),
          db.collection('Users').doc(notification.operatorId).get()
        ])

        if (!userResult.data || !eventResult.data || !operatorResult.data) {
          // 相关数据不存在，标记为不可重试
          await db.collection('Notifications').doc(notification._id).update({
            data: {
              error: '相关数据不存在',
              retryCount: maxRetries // 设置为最大重试次数，避免再次处理
            }
          })
          continue
        }

        // 重试发送通知
        const retryResult = await sendEventDeletedNotification({
          user: userResult.data,
          event: eventResult.data,
          operator: operatorResult.data,
          deleteReason: notification.metadata.deleteReason
        }, notification.retryCount)

        if (retryResult.success) {
          processResults.success++
          // 删除原失败记录
          await db.collection('Notifications').doc(notification._id).remove()
        } else {
          processResults.failed++
        }

        processResults.details.push({
          notificationId: notification._id,
          success: retryResult.success,
          message: retryResult.message
        })

      } catch (error) {
        processResults.failed++
        processResults.details.push({
          notificationId: notification._id,
          success: false,
          message: error.message
        })
      }
    }

    return {
      success: true,
      data: processResults,
      message: `自动处理完成：成功${processResults.success}个，失败${processResults.failed}个`
    }
  } catch (error) {
    console.error('自动处理失败通知出错:', error)
    return {
      success: false,
      message: '自动处理失败通知出错',
      error: error.message
    }
  }
}

/**
 * 获取通知统计信息
 */
async function getNotificationStats(params) {
  try {
    const { timeRange = 7 } = params // 默认7天
    const startTime = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000)

    // 并行查询各种状态的通知数量
    const [sentResult, failedResult, pendingResult, readResult] = await Promise.all([
      db.collection('Notifications').where({
        status: 'sent',
        createTime: db.command.gte(startTime)
      }).count(),
      db.collection('Notifications').where({
        status: 'failed',
        createTime: db.command.gte(startTime)
      }).count(),
      db.collection('Notifications').where({
        status: 'pending',
        createTime: db.command.gte(startTime)
      }).count(),
      db.collection('Notifications').where({
        status: 'read',
        createTime: db.command.gte(startTime)
      }).count()
    ])

    const stats = {
      timeRange: timeRange,
      total: sentResult.total + failedResult.total + pendingResult.total + readResult.total,
      sent: sentResult.total,
      failed: failedResult.total,
      pending: pendingResult.total,
      read: readResult.total,
      successRate: sentResult.total + readResult.total > 0 ?
        ((sentResult.total + readResult.total) / (sentResult.total + failedResult.total + readResult.total) * 100).toFixed(2) + '%' : '0%',
      readRate: sentResult.total + readResult.total > 0 ?
        (readResult.total / (sentResult.total + readResult.total) * 100).toFixed(2) + '%' : '0%'
    }

    return {
      success: true,
      data: stats,
      message: '获取通知统计成功'
    }
  } catch (error) {
    console.error('获取通知统计失败:', error)
    return {
      success: false,
      message: '获取通知统计失败',
      error: error.message
    }
  }
}

/**
 * 清理旧的通知记录
 */
async function cleanupOldNotifications(params) {
  const { maxAge = 30 * 24 * 60 * 60 * 1000 } = params // 默认30天

  try {
    const cutoffTime = new Date(Date.now() - maxAge)

    // 获取需要清理的通知
    const oldNotifications = await db.collection('Notifications').where({
      createTime: db.command.lt(cutoffTime)
    }).get()

    let cleanedCount = 0
    for (const notification of oldNotifications.data) {
      await db.collection('Notifications').doc(notification._id).remove()
      cleanedCount++
    }

    return {
      success: true,
      data: { cleanedCount },
      message: `清理了${cleanedCount}条旧通知记录`
    }
  } catch (error) {
    console.error('清理旧通知记录失败:', error)
    return {
      success: false,
      message: '清理旧通知记录失败',
      error: error.message
    }
  }
}

// ==================== 云函数入口 ====================

exports.main = async (event, context) => {
  const { action } = event

  try {
    switch (action) {
      case 'sendEventDeletedNotification':
        return await sendEventDeletedNotification(event)
      case 'sendBatchEventDeletedNotifications':
        return await sendBatchEventDeletedNotifications(event)
      case 'generateNotificationTemplate':
        return {
          success: true,
          data: generateEventDeletedNotification(event)
        }
      case 'getUserNotifications':
        return await getUserNotifications(event)
      case 'markNotificationAsRead':
        return await markNotificationAsRead(event)
      case 'retryFailedNotifications':
        return await retryFailedNotifications(event)
      case 'processFailedNotifications':
        return await processFailedNotifications(event)
      case 'getNotificationStats':
        return await getNotificationStats(event)
      case 'cleanupOldNotifications':
        return await cleanupOldNotifications(event)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('通知服务云函数执行错误:', error)
    return {
      success: false,
      message: error.message || '服务器错误'
    }
  }
}

// ==================== 导出函数 ====================

module.exports = {
  NOTIFICATION_TEMPLATES,
  generateEventDeletedNotification,
  generateWechatTemplateMessage,
  generateBatchNotificationSummary,
  sendEventDeletedNotification,
  sendBatchEventDeletedNotifications,
  getUserNotifications,
  markNotificationAsRead,
  retryFailedNotifications,
  processFailedNotifications,
  getNotificationStats,
  cleanupOldNotifications,
  formatDateTime,
  validateNotificationParams,
  simulateNotificationSending,
  isRetryableError
}
