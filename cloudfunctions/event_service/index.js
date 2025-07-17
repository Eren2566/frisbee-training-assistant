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
    const createResult = await db.collection('Events').add({
      data: {
        creatorId: openid,
        title,
        eventTime: new Date(eventTime),
        location,
        content,
        notes: notes || '',
        status: 'registering',
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
