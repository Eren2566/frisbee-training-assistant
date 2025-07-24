// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action } = event

  try {
    switch (action) {
      case 'create':
        return await createEvent(event, wxContext)
      case 'getList':
        return await getEventList(event, wxContext)
      case 'getDetail':
        return await getEventDetail(event, wxContext)
      case 'delete':
        return await deleteEvent(event, wxContext)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('云函数执行错误:', error)
    return {
      success: false,
      message: '服务器错误',
      error: error.message
    }
  }
}

// 创建训练活动
async function createEvent(event, wxContext) {
  const { title, eventTime, location, content, notes, testUserId } = event
  // 如果传入了测试用户ID，使用测试用户ID；否则使用真实用户ID
  const openid = testUserId || wxContext.OPENID

  try {
    // 验证用户权限
    const userResult = await db.collection('Users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0 || userResult.data[0].role !== 'admin') {
      return {
        success: false,
        message: '权限不足，只有管理员可以创建训练'
      }
    }

    // 创建训练活动
    // 确保eventTime是正确的Date对象，处理本地时间字符串
    let parsedEventTime
    if (typeof eventTime === 'string') {
      // 如果是本地时间格式 "YYYY-MM-DD HH:mm:ss"，需要明确指定为本地时间
      if (eventTime.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        // 将本地时间字符串转换为ISO格式，添加时区信息
        const isoString = eventTime.replace(' ', 'T') + '+08:00'
        parsedEventTime = new Date(isoString)
      } else {
        parsedEventTime = new Date(eventTime)
      }
    } else {
      parsedEventTime = new Date(eventTime)
    }

    // 验证时间是否有效
    if (isNaN(parsedEventTime.getTime())) {
      return {
        success: false,
        message: '无效的训练时间'
      }
    }

    const createResult = await db.collection('Events').add({
      data: {
        creatorId: openid,
        title,
        eventTime: parsedEventTime,
        location,
        content,
        notes: notes || '',
        status: 'registering',
        // 软删除相关字段
        isDeleted: false,
        deleteTime: null,
        deletedBy: null,
        deleteReason: null,
        createTime: new Date(),
        updateTime: new Date()
      }
    })

    return {
      success: true,
      data: {
        _id: createResult._id
      },
      message: '训练创建成功'
    }
  } catch (error) {
    console.error('创建训练失败:', error)
    return {
      success: false,
      message: '创建训练失败',
      error: error.message
    }
  }
}

// 获取训练列表
async function getEventList(event, wxContext) {
  try {
    const result = await db.collection('Events')
      .where({
        isDeleted: false  // 只获取未删除的训练
      })
      .orderBy('eventTime', 'desc')
      .get()

    // 检查并更新过期训练的状态
    const now = new Date()
    const updatedEvents = []

    for (const eventItem of result.data) {
      const eventTime = new Date(eventItem.eventTime)

      // 如果训练时间已过且状态仍为报名中，则更新为已结束
      if (eventTime < now && eventItem.status === 'registering') {
        try {
          await db.collection('Events').doc(eventItem._id).update({
            data: {
              status: 'finished',
              updateTime: new Date()
            }
          })

          // 更新返回数据中的状态
          updatedEvents.push({
            ...eventItem,
            status: 'finished',
            updateTime: new Date()
          })
        } catch (updateError) {
          console.error('更新训练状态失败:', updateError)
          // 如果更新失败，仍返回原数据
          updatedEvents.push(eventItem)
        }
      } else {
        updatedEvents.push(eventItem)
      }
    }

    return {
      success: true,
      data: updatedEvents,
      message: '获取训练列表成功'
    }
  } catch (error) {
    console.error('获取训练列表失败:', error)
    return {
      success: false,
      message: '获取训练列表失败',
      error: error.message
    }
  }
}

// 获取训练详情
async function getEventDetail(event, wxContext) {
  const { eventId } = event

  try {
    const result = await db.collection('Events').doc(eventId).get()

    if (!result.data) {
      return {
        success: false,
        message: '训练不存在'
      }
    }

    let eventData = result.data

    // 检查并更新过期训练的状态
    const now = new Date()
    const eventTime = new Date(eventData.eventTime)

    if (eventTime < now && eventData.status === 'registering') {
      try {
        await db.collection('Events').doc(eventId).update({
          data: {
            status: 'finished',
            updateTime: new Date()
          }
        })

        // 更新返回数据中的状态
        eventData = {
          ...eventData,
          status: 'finished',
          updateTime: new Date()
        }
      } catch (updateError) {
        console.error('更新训练状态失败:', updateError)
        // 如果更新失败，仍返回原数据
      }
    }

    return {
      success: true,
      data: eventData,
      message: '获取训练详情成功'
    }
  } catch (error) {
    console.error('获取训练详情失败:', error)
    return {
      success: false,
      message: '获取训练详情失败',
      error: error.message
    }
  }
}

// 删除训练活动（软删除）
async function deleteEvent(event, wxContext) {
  const { eventId, deleteReason } = event
  const openid = wxContext.OPENID

  try {

    // 验证参数
    if (!eventId) {
      return {
        success: false,
        message: '训练ID不能为空'
      }
    }

    if (!openid) {
      return {
        success: false,
        message: '用户身份验证失败'
      }
    }

    // 获取训练详情
    const eventResult = await db.collection('Events').doc(eventId).get()

    if (!eventResult.data) {
      return {
        success: false,
        message: '训练不存在'
      }
    }

    const eventData = eventResult.data

    // 检查训练是否已被删除
    if (eventData.isDeleted) {
      return {
        success: false,
        message: '训练已被删除'
      }
    }

    // 权限验证：只有管理员或创建者可以删除
    const userResult = await db.collection('Users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    const user = userResult.data[0]
    const isAdmin = user.role === 'admin'
    const isCreator = eventData.creatorId === openid

    if (!isAdmin && !isCreator) {
      return {
        success: false,
        message: '权限不足，只有管理员或创建者可以删除训练'
      }
    }

    // 时间限制检查：训练开始前2小时不能删除
    const eventTime = new Date(eventData.eventTime)
    const now = new Date()
    const timeDiff = eventTime.getTime() - now.getTime()
    const hoursUntilEvent = timeDiff / (1000 * 60 * 60)
    const minutesUntilEvent = timeDiff / (1000 * 60)

    // 如果训练已经开始，不能删除
    if (timeDiff <= 0) {
      return {
        success: false,
        message: '训练已经开始或结束，不能删除'
      }
    }

    // 如果距离训练开始不足2小时，不能删除
    if (hoursUntilEvent <= 2) {
      const remainingTime = minutesUntilEvent > 60 ?
        `${Math.floor(hoursUntilEvent)}小时${Math.floor(minutesUntilEvent % 60)}分钟` :
        `${Math.floor(minutesUntilEvent)}分钟`

      return {
        success: false,
        message: `距离训练开始仅剩${remainingTime}，不能删除训练`
      }
    }

    // 检查报名情况和删除影响
    const registrationResult = await db.collection('Registrations').where({
      eventId: eventId
    }).get()

    const registrations = registrationResult.data
    const registrationCount = registrations.length

    // 统计不同状态的报名数量
    const registrationStats = {
      total: registrationCount,
      signedUp: registrations.filter(r => r.status === 'signed_up').length,
      leaveRequested: registrations.filter(r => r.status === 'leave_requested').length,
      present: registrations.filter(r => r.status === 'present').length,
      absent: registrations.filter(r => r.status === 'absent').length
    }

    // 如果有用户已经出勤，需要特别提醒
    if (registrationStats.present > 0) {
      return {
        success: false,
        message: `已有${registrationStats.present}人确认出勤，不能删除训练`
      }
    }

    // 准备删除数据
    const deleteTime = new Date()
    const finalDeleteReason = deleteReason || '管理员删除'

    // 执行软删除
    await db.collection('Events').doc(eventId).update({
      data: {
        isDeleted: true,
        deleteTime: deleteTime,
        deletedBy: openid,
        deleteReason: finalDeleteReason,
        updateTime: deleteTime
      }
    })

    // 标记相关报名记录为已取消（如果有报名记录）
    if (registrationCount > 0) {
      try {
        // 批量更新报名记录状态
        const batch = db.collection('Registrations').where({
          eventId: eventId
        })

        await batch.update({
          data: {
            status: 'cancelled',
            cancelTime: deleteTime,
            cancelReason: '训练已被删除',
            updateTime: deleteTime
          }
        })

        console.log(`已标记${registrationCount}条报名记录为已取消`)
      } catch (updateError) {
        console.error('更新报名记录状态失败:', updateError)
        // 不影响删除操作的成功
      }
    }

    // 记录删除操作日志
    try {
      await db.collection('EventLogs').add({
        data: {
          eventId: eventId,
          action: 'delete',
          operatorId: openid,
          operatorRole: user.role,
          eventTitle: eventData.title,
          eventTime: eventData.eventTime,
          deleteReason: finalDeleteReason,
          affectedRegistrations: registrationStats,
          operationTime: deleteTime,
          ipAddress: wxContext.CLIENTIP || 'unknown',
          userAgent: wxContext.CLIENTIPV6 || 'unknown'
        }
      })
    } catch (logError) {
      console.error('记录删除日志失败:', logError)
      // 日志记录失败不影响删除操作
    }

    // 发送删除通知给受影响的用户
    let notificationResult = null
    if (registrationStats.total > 0) {
      try {
        // 获取需要通知的用户信息
        const affectedUserIds = registrations.map(r => r.userId)
        const affectedUsersResult = await db.collection('Users').where({
          _id: db.command.in(affectedUserIds)
        }).get()

        if (affectedUsersResult.data.length > 0) {
          // 调用通知服务发送批量通知
          notificationResult = await cloud.callFunction({
            name: 'notification_service',
            data: {
              action: 'sendBatchEventDeletedNotifications',
              users: affectedUsersResult.data,
              event: eventData,
              operator: user,
              deleteReason: finalDeleteReason
            }
          })

          console.log('通知发送结果:', notificationResult.result)
        }
      } catch (notificationError) {
        console.error('发送删除通知失败:', notificationError)
        // 通知发送失败不影响删除操作的成功
      }
    }

    return {
      success: true,
      message: '训练删除成功',
      data: {
        eventId: eventId,
        eventTitle: eventData.title,
        deleteTime: deleteTime,
        deletedBy: openid,
        deleteReason: finalDeleteReason,
        affectedUsers: registrationStats.total,
        registrationStats: registrationStats,
        notificationRequired: registrationStats.total > 0,
        notificationResult: notificationResult?.result || null
      }
    }
  } catch (error) {
    console.error('删除训练失败:', error)
    return {
      success: false,
      message: '删除训练失败',
      error: error.message
    }
  }
}
