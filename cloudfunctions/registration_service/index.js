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
      case 'register':
        return await registerForEvent(event, wxContext)
      case 'getListByEvent':
        return await getRegistrationListByEvent(event, wxContext)
      case 'getMyList':
        return await getMyRegistrationList(event, wxContext)
      case 'updateAttendance':
        return await updateAttendance(event, wxContext)
      case 'getUserStatus':
        return await getUserEventStatus(event, wxContext)
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

// 用户报名/请假
async function registerForEvent(event, wxContext) {
  const { eventId, status, testUserId } = event
  // 如果传入了测试用户ID，使用测试用户ID；否则使用真实用户ID
  const openid = testUserId || wxContext.OPENID

  try {
    // 检查是否已经有记录
    const existingResult = await db.collection('Registrations').where({
      eventId,
      userId: openid
    }).get()

    if (existingResult.data.length > 0) {
      // 已有记录，允许状态切换
      const existingRecord = existingResult.data[0]

      // 更新现有记录的状态（允许在报名和请假之间切换）
      await db.collection('Registrations').doc(existingRecord._id).update({
        data: {
          status, // 'signed_up' 或 'leave_requested'
          updateTime: new Date()
        }
      })

      return {
        success: true,
        data: {
          _id: existingRecord._id
        },
        message: status === 'signed_up' ? '报名成功' : '请假成功'
      }
    } else {
      // 没有记录，创建新记录
      const createResult = await db.collection('Registrations').add({
        data: {
          eventId,
          userId: openid,
          status, // 'signed_up' 或 'leave_requested'
          createTime: new Date(),
          updateTime: new Date()
        }
      })

      return {
        success: true,
        data: {
          _id: createResult._id
        },
        message: status === 'signed_up' ? '报名成功' : '请假成功'
      }
    }
  } catch (error) {
    console.error('报名/请假失败:', error)
    return {
      success: false,
      message: '操作失败',
      error: error.message
    }
  }
}

// 获取某个训练的报名列表
async function getRegistrationListByEvent(event, wxContext) {
  const { eventId } = event

  try {
    // 获取报名记录
    const registrationResult = await db.collection('Registrations').where({
      eventId
    }).get()

    // 获取用户信息
    const userIds = registrationResult.data.map(item => item.userId)
    const userResult = await db.collection('Users').where({
      _openid: db.command.in(userIds)
    }).get()

    // 合并数据
    const registrationList = registrationResult.data.map(registration => {
      const user = userResult.data.find(u => u._openid === registration.userId)
      return {
        ...registration,
        userInfo: user
      }
    })

    return {
      success: true,
      data: registrationList,
      message: '获取报名列表成功'
    }
  } catch (error) {
    console.error('获取报名列表失败:', error)
    return {
      success: false,
      message: '获取报名列表失败',
      error: error.message
    }
  }
}

// 获取我的报名列表
async function getMyRegistrationList(event, wxContext) {
  const openid = wxContext.OPENID

  try {
    const result = await db.collection('Registrations').where({
      userId: openid
    }).get()

    // 获取对应的训练信息，只获取未删除的训练
    const eventIds = result.data.map(item => item.eventId)
    const eventResult = await db.collection('Events').where({
      _id: db.command.in(eventIds),
      isDeleted: db.command.neq(true) // 过滤掉已删除的训练
    }).get()

    // 合并数据，只保留训练信息存在的记录（即未删除的训练）
    const myList = result.data
      .map(registration => {
        const eventInfo = eventResult.data.find(e => e._id === registration.eventId)
        return {
          ...registration,
          eventInfo
        }
      })
      .filter(item => item.eventInfo) // 过滤掉训练信息不存在的记录（已删除的训练）

    return {
      success: true,
      data: myList,
      message: '获取我的报名列表成功'
    }
  } catch (error) {
    console.error('获取我的报名列表失败:', error)
    return {
      success: false,
      message: '获取我的报名列表失败',
      error: error.message
    }
  }
}

// 更新出勤状态（管理员操作）
async function updateAttendance(event, wxContext) {
  const { registrationId, status } = event
  const openid = wxContext.OPENID

  try {
    // 验证管理员权限
    const userResult = await db.collection('Users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0 || userResult.data[0].role !== 'admin') {
      return {
        success: false,
        message: '权限不足，只有管理员可以更新出勤状态'
      }
    }

    // 更新出勤状态
    await db.collection('Registrations').doc(registrationId).update({
      data: {
        status, // 'present' 或 'absent'
        updateTime: new Date()
      }
    })

    return {
      success: true,
      message: '出勤状态更新成功'
    }
  } catch (error) {
    console.error('更新出勤状态失败:', error)
    return {
      success: false,
      message: '更新出勤状态失败',
      error: error.message
    }
  }
}

// 获取用户在某个活动的状态
async function getUserEventStatus(event, wxContext) {
  const { eventId, testUserId } = event
  // 如果传入了测试用户ID，使用测试用户ID；否则使用真实用户ID
  const openid = testUserId || wxContext.OPENID

  try {
    const result = await db.collection('Registrations').where({
      eventId,
      userId: openid
    }).get()

    return {
      success: true,
      data: result.data.length > 0 ? result.data[0] : null,
      message: '获取用户状态成功'
    }
  } catch (error) {
    console.error('获取用户状态失败:', error)
    return {
      success: false,
      message: '获取用户状态失败',
      error: error.message
    }
  }
}
