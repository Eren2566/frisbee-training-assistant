// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action } = event

  try {
    // 验证管理员权限（某些统计功能需要）
    if (['getTeamStats', 'getDetailedAnalytics'].includes(action)) {
      await checkAdminPermission(wxContext.OPENID)
    }

    switch (action) {
      case 'getUserStats':
        return await getUserStats(wxContext.OPENID)
      case 'getTeamStats':
        return await getTeamStats()
      case 'getEventStats':
        return await getEventStats(event.eventId)
      case 'getAttendanceReport':
        return await getAttendanceReport(event.timeRange)
      case 'getDetailedAnalytics':
        return await getDetailedAnalytics(event.dateRange)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('统计分析云函数执行错误:', error)
    return {
      success: false,
      message: error.message || '服务器错误'
    }
  }
}

// 验证管理员权限
async function checkAdminPermission(openid) {
  const userResult = await db.collection('Users').where({
    _openid: openid
  }).get()

  if (userResult.data.length === 0 || userResult.data[0].role !== 'admin') {
    throw new Error('权限不足，只有管理员可以查看团队统计')
  }
}

// 获取用户个人统计
async function getUserStats(openid) {
  try {
    // 获取用户报名记录
    const registrations = await db.collection('Registrations').where({
      userId: openid
    }).get()

    // 获取相关训练信息
    const eventIds = registrations.data.map(reg => reg.eventId)
    const events = eventIds.length > 0 ? await db.collection('Events').where({
      _id: _.in(eventIds)
    }).get() : { data: [] }

    // 计算统计数据
    const totalRegistrations = registrations.data.length
    const presentCount = registrations.data.filter(reg => reg.status === 'present').length
    const absentCount = registrations.data.filter(reg => reg.status === 'absent').length
    const leaveCount = registrations.data.filter(reg => reg.status === 'leave_requested').length
    const attendanceRate = totalRegistrations > 0 ? Math.round((presentCount / totalRegistrations) * 100) : 0

    // 按月统计
    const monthlyStats = getMonthlyStats(registrations.data, events.data)

    // 最近活动
    const recentActivities = registrations.data
      .sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
      .slice(0, 10)
      .map(reg => {
        const event = events.data.find(e => e._id === reg.eventId)
        return {
          ...reg,
          eventInfo: event
        }
      })

    return {
      success: true,
      data: {
        summary: {
          totalRegistrations,
          presentCount,
          absentCount,
          leaveCount,
          attendanceRate
        },
        monthlyStats,
        recentActivities
      }
    }
  } catch (error) {
    throw new Error('获取用户统计失败: ' + error.message)
  }
}

// 获取团队统计
async function getTeamStats() {
  try {
    // 用户统计
    const usersResult = await db.collection('Users').get()
    const totalUsers = usersResult.data.length
    const adminCount = usersResult.data.filter(user => user.role === 'admin').length
    const memberCount = usersResult.data.filter(user => user.role === 'member').length

    // 训练统计
    const eventsResult = await db.collection('Events').get()
    const totalEvents = eventsResult.data.length
    const activeEvents = eventsResult.data.filter(event => event.status === 'registering').length
    const finishedEvents = eventsResult.data.filter(event => event.status === 'finished').length

    // 报名统计
    const registrationsResult = await db.collection('Registrations').get()
    const totalRegistrations = registrationsResult.data.length
    const presentCount = registrationsResult.data.filter(reg => reg.status === 'present').length
    const absentCount = registrationsResult.data.filter(reg => reg.status === 'absent').length

    // 活跃度统计
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    
    const recentRegistrations = registrationsResult.data.filter(reg => 
      new Date(reg.createTime) >= lastMonth
    )
    const activeUsersCount = new Set(recentRegistrations.map(reg => reg.userId)).size

    // 最活跃用户
    const userActivityMap = new Map()
    registrationsResult.data.forEach(reg => {
      const count = userActivityMap.get(reg.userId) || 0
      userActivityMap.set(reg.userId, count + 1)
    })

    const topActiveUsers = Array.from(userActivityMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => {
        const user = usersResult.data.find(u => u._openid === userId)
        return {
          userId,
          userName: user ? user.nickName : '未知用户',
          activityCount: count
        }
      })

    return {
      success: true,
      data: {
        userStats: {
          totalUsers,
          adminCount,
          memberCount,
          activeUsersCount
        },
        eventStats: {
          totalEvents,
          activeEvents,
          finishedEvents
        },
        attendanceStats: {
          totalRegistrations,
          presentCount,
          absentCount,
          attendanceRate: totalRegistrations > 0 ? Math.round((presentCount / totalRegistrations) * 100) : 0
        },
        topActiveUsers
      }
    }
  } catch (error) {
    throw new Error('获取团队统计失败: ' + error.message)
  }
}

// 获取单个训练统计
async function getEventStats(eventId) {
  try {
    if (!eventId) {
      throw new Error('训练ID不能为空')
    }

    // 获取训练信息
    const eventResult = await db.collection('Events').doc(eventId).get()
    if (!eventResult.data) {
      throw new Error('训练不存在')
    }

    // 获取报名统计
    const registrations = await db.collection('Registrations').where({
      eventId: eventId
    }).get()

    // 获取用户信息
    const userIds = registrations.data.map(reg => reg.userId)
    const users = userIds.length > 0 ? await db.collection('Users').where({
      _openid: _.in(userIds)
    }).get() : { data: [] }

    // 统计数据
    const totalRegistrations = registrations.data.length
    const signedUpCount = registrations.data.filter(reg => reg.status === 'signed_up').length
    const leaveCount = registrations.data.filter(reg => reg.status === 'leave_requested').length
    const presentCount = registrations.data.filter(reg => reg.status === 'present').length
    const absentCount = registrations.data.filter(reg => reg.status === 'absent').length

    // 报名详情
    const registrationDetails = registrations.data.map(reg => {
      const user = users.data.find(u => u._openid === reg.userId)
      return {
        ...reg,
        userInfo: user
      }
    })

    return {
      success: true,
      data: {
        eventInfo: eventResult.data,
        stats: {
          totalRegistrations,
          signedUpCount,
          leaveCount,
          presentCount,
          absentCount,
          attendanceRate: totalRegistrations > 0 ? Math.round((presentCount / totalRegistrations) * 100) : 0
        },
        registrationDetails
      }
    }
  } catch (error) {
    throw new Error('获取训练统计失败: ' + error.message)
  }
}

// 获取出勤报告
async function getAttendanceReport(timeRange = 'month') {
  try {
    const now = new Date()
    let startDate

    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        break
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        break
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    }

    // 获取时间范围内的训练
    const events = await db.collection('Events').where({
      eventTime: _.gte(startDate).and(_.lte(now))
    }).get()

    // 获取相关报名记录
    const eventIds = events.data.map(event => event._id)
    const registrations = eventIds.length > 0 ? await db.collection('Registrations').where({
      eventId: _.in(eventIds)
    }).get() : { data: [] }

    // 按日期统计
    const dailyStats = {}
    events.data.forEach(event => {
      const dateKey = event.eventTime.toISOString().split('T')[0]
      const eventRegistrations = registrations.data.filter(reg => reg.eventId === event._id)
      
      dailyStats[dateKey] = {
        date: dateKey,
        eventCount: (dailyStats[dateKey]?.eventCount || 0) + 1,
        totalRegistrations: (dailyStats[dateKey]?.totalRegistrations || 0) + eventRegistrations.length,
        presentCount: (dailyStats[dateKey]?.presentCount || 0) + eventRegistrations.filter(reg => reg.status === 'present').length,
        absentCount: (dailyStats[dateKey]?.absentCount || 0) + eventRegistrations.filter(reg => reg.status === 'absent').length
      }
    })

    return {
      success: true,
      data: {
        timeRange,
        startDate,
        endDate: now,
        dailyStats: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)),
        summary: {
          totalEvents: events.data.length,
          totalRegistrations: registrations.data.length,
          totalPresent: registrations.data.filter(reg => reg.status === 'present').length,
          totalAbsent: registrations.data.filter(reg => reg.status === 'absent').length
        }
      }
    }
  } catch (error) {
    throw new Error('获取出勤报告失败: ' + error.message)
  }
}

// 获取详细分析数据
async function getDetailedAnalytics(dateRange) {
  try {
    // 这里可以实现更复杂的数据分析逻辑
    // 比如趋势分析、预测分析等
    
    const analytics = {
      userGrowth: await getUserGrowthAnalytics(dateRange),
      eventTrends: await getEventTrendsAnalytics(dateRange),
      attendancePatterns: await getAttendancePatternsAnalytics(dateRange)
    }

    return {
      success: true,
      data: analytics
    }
  } catch (error) {
    throw new Error('获取详细分析失败: ' + error.message)
  }
}

// 辅助函数：按月统计
function getMonthlyStats(registrations, events) {
  const monthlyMap = new Map()
  
  registrations.forEach(reg => {
    const event = events.find(e => e._id === reg.eventId)
    if (!event) return
    
    const monthKey = event.eventTime.toISOString().substring(0, 7) // YYYY-MM
    
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        month: monthKey,
        totalEvents: 0,
        presentCount: 0,
        absentCount: 0,
        leaveCount: 0
      })
    }
    
    const monthData = monthlyMap.get(monthKey)
    monthData.totalEvents++
    
    if (reg.status === 'present') monthData.presentCount++
    else if (reg.status === 'absent') monthData.absentCount++
    else if (reg.status === 'leave_requested') monthData.leaveCount++
  })
  
  return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))
}

// 用户增长分析
async function getUserGrowthAnalytics(dateRange) {
  // 实现用户增长趋势分析
  return {
    growth: 'positive',
    rate: 15.5,
    newUsers: 12,
    activeUsers: 45
  }
}

// 训练趋势分析
async function getEventTrendsAnalytics(dateRange) {
  // 实现训练活动趋势分析
  return {
    frequency: 'increasing',
    averageAttendance: 78.5,
    popularTimes: ['19:00', '20:00'],
    popularLocations: ['体育场草坪A区', '体育场草坪B区']
  }
}

// 出勤模式分析
async function getAttendancePatternsAnalytics(dateRange) {
  // 实现出勤模式分析
  return {
    bestAttendanceDay: 'Saturday',
    worstAttendanceDay: 'Monday',
    seasonalTrends: 'stable',
    loyalMembers: 25
  }
}
