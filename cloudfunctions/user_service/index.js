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
      case 'login':
        return await login(event, wxContext)
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

// 用户登录/注册
async function login(event, wxContext) {
  const { nickName, avatarUrl } = event
  const openid = wxContext.OPENID

  try {
    // 查询用户是否已存在
    const userResult = await db.collection('Users').where({
      _openid: openid
    }).get()

    let userInfo

    if (userResult.data.length === 0) {
      // 用户不存在，创建新用户
      const createResult = await db.collection('Users').add({
        data: {
          _openid: openid,
          nickName: nickName || '微信用户',
          avatarUrl: avatarUrl || '',
          role: 'member', // 默认为普通队员
          createTime: new Date()
        }
      })

      userInfo = {
        _id: createResult._id,
        _openid: openid,
        nickName: nickName || '微信用户',
        avatarUrl: avatarUrl || '',
        role: 'member',
        createTime: new Date()
      }
    } else {
      // 用户已存在，返回用户信息
      userInfo = userResult.data[0]
    }

    return {
      success: true,
      data: userInfo,
      message: '登录成功'
    }
  } catch (error) {
    console.error('登录失败:', error)
    return {
      success: false,
      message: '登录失败',
      error: error.message
    }
  }
}
