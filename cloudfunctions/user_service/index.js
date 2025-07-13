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
      case 'completeUserInfo':
        return await completeUserInfo(event, wxContext)
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
          isInfoCompleted: false, // 标记信息是否完善
          gender: null,
          institute: null,
          realName: null,
          discName: null,
          contactInfo: null,
          createTime: new Date()
        }
      })

      userInfo = {
        _id: createResult._id,
        _openid: openid,
        nickName: nickName || '微信用户',
        avatarUrl: avatarUrl || '',
        role: 'member',
        isInfoCompleted: false, // 标记信息是否完善
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

// 完善用户信息
async function completeUserInfo(event, wxContext) {
  const { gender, institute, realName, discName, contactInfo } = event
  const openid = wxContext.OPENID

  try {
    // 验证必填字段
    if (!gender || !institute || !realName || !discName || !contactInfo) {
      return {
        success: false,
        message: '请填写完整的用户信息'
      }
    }

    // 验证盘名格式
    const discNameValidation = validateDiscName(discName)
    if (!discNameValidation.valid) {
      return {
        success: false,
        message: discNameValidation.message
      }
    }

    // 更新用户信息
    const updateResult = await db.collection('Users').where({
      _openid: openid
    }).update({
      data: {
        gender,
        institute,
        realName,
        discName,
        contactInfo,
        isInfoCompleted: true,
        updateTime: new Date()
      }
    })

    if (updateResult.stats.updated === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    // 获取更新后的用户信息
    const userResult = await db.collection('Users').where({
      _openid: openid
    }).get()

    return {
      success: true,
      data: userResult.data[0],
      message: '用户信息完善成功'
    }
  } catch (error) {
    console.error('完善用户信息失败:', error)
    return {
      success: false,
      message: '完善用户信息失败',
      error: error.message
    }
  }
}

// 验证盘名格式
function validateDiscName(discName) {
  if (!discName || discName.trim() === '') {
    return { valid: false, message: '盘名不能为空' }
  }

  const trimmedName = discName.trim()

  // 检查是否包含特殊符号（数字、标点符号、表情符号等）
  const specialCharsRegex = /[0-9\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\uFF00-\uFFEF\u2000-\u206F\u2E00-\u2E7F\u3000-\u303F\uFE30-\uFE4F\uFE50-\uFE6F\u1F600-\u1F64F\u1F300-\u1F5FF\u1F680-\u1F6FF\u1F1E0-\u1F1FF]/
  if (specialCharsRegex.test(trimmedName)) {
    return { valid: false, message: '盘名不能包含数字、标点符号或表情符号' }
  }

  // 检查中文字符数量
  const chineseChars = trimmedName.match(/[\u4e00-\u9fff]/g) || []
  if (chineseChars.length > 4) {
    return { valid: false, message: '中文字符不能超过4个字' }
  }

  // 检查英文字符数量
  const englishChars = trimmedName.match(/[a-zA-Z]/g) || []
  if (englishChars.length > 20) {
    return { valid: false, message: '英文字符不能超过20个字母' }
  }

  // 检查是否只包含中文和英文
  const validCharsRegex = /^[\u4e00-\u9fffa-zA-Z\s]+$/
  if (!validCharsRegex.test(trimmedName)) {
    return { valid: false, message: '盘名只能包含中文和英文字符' }
  }

  return { valid: true }
}
