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
      case 'updateAvatar':
        return await updateAvatar(event, wxContext)
      case 'updateDiscName':
        return await updateDiscName(event, wxContext)
      case 'getDiscNameChangeInfo':
        return await getDiscNameChangeInfo(event, wxContext)
      case 'upgradeToAdmin':
        return await upgradeToAdmin(event, wxContext)
      case 'checkUserRole':
        return await checkUserRole(event, wxContext)
      case 'updateUserInfo':
        return await updateUserInfo(event, wxContext)
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
          // 头像相关字段
          customAvatarUrl: '',
          avatarType: 'wechat',
          avatarUpdateTime: null,
          // 盘名修改限制字段
          discNameChangeCount: 0,           // 已修改次数，默认0
          discNameChangeHistory: [],        // 修改历史记录
          lastDiscNameChangeTime: null,     // 最后修改时间
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
        // 头像相关字段
        customAvatarUrl: '',
        avatarType: 'wechat',
        avatarUpdateTime: null,
        // 盘名修改限制字段
        discNameChangeCount: 0,
        discNameChangeHistory: [],
        lastDiscNameChangeTime: null,
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

// 更新用户头像
async function updateAvatar(event, wxContext) {
  const { avatarUrl, avatarType = 'custom' } = event
  const openid = wxContext.OPENID

  try {
    // 验证参数
    if (!avatarUrl) {
      return {
        success: false,
        message: '头像URL不能为空'
      }
    }

    // 验证用户是否存在
    const userResult = await db.collection('Users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    // 更新用户头像信息
    const updateData = {
      customAvatarUrl: avatarUrl,
      avatarType: avatarType,
      avatarUpdateTime: new Date()
    }

    await db.collection('Users').where({
      _openid: openid
    }).update({
      data: updateData
    })

    return {
      success: true,
      message: '头像更新成功',
      data: updateData
    }
  } catch (error) {
    console.error('更新头像失败:', error)
    return {
      success: false,
      message: '更新头像失败',
      error: error.message
    }
  }
}

// 更新盘名
async function updateDiscName(event, wxContext) {
  const { newDiscName } = event
  const openid = wxContext.OPENID

  try {
    // 验证参数
    if (!newDiscName || typeof newDiscName !== 'string') {
      return {
        success: false,
        message: '盘名不能为空'
      }
    }

    // 验证盘名格式
    const validation = validateDiscName(newDiscName)
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message
      }
    }

    // 获取用户信息
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
    const currentDiscName = user.discName
    const changeCount = user.discNameChangeCount || 0
    const changeHistory = user.discNameChangeHistory || []

    // 检查是否已达到修改次数限制
    if (changeCount >= 3) {
      return {
        success: false,
        message: '已达到盘名修改次数限制（最多3次）',
        data: {
          changeCount: changeCount,
          remainingChanges: 0
        }
      }
    }

    // 检查是否与当前盘名相同
    if (currentDiscName === newDiscName) {
      return {
        success: false,
        message: '新盘名与当前盘名相同'
      }
    }

    // 记录修改历史
    const changeRecord = {
      oldName: currentDiscName || '',
      newName: newDiscName,
      changeTime: new Date(),
      changeReason: '用户主动修改'
    }

    const newChangeHistory = [...changeHistory, changeRecord]
    const newChangeCount = changeCount + 1

    // 更新用户信息
    await db.collection('Users').where({
      _openid: openid
    }).update({
      data: {
        discName: newDiscName,
        discNameChangeCount: newChangeCount,
        discNameChangeHistory: newChangeHistory,
        lastDiscNameChangeTime: new Date()
      }
    })

    return {
      success: true,
      message: '盘名修改成功',
      data: {
        newDiscName: newDiscName,
        changeCount: newChangeCount,
        remainingChanges: 3 - newChangeCount,
        changeHistory: newChangeHistory
      }
    }
  } catch (error) {
    console.error('修改盘名失败:', error)
    return {
      success: false,
      message: '修改盘名失败',
      error: error.message
    }
  }
}

// 获取盘名修改信息
async function getDiscNameChangeInfo(event, wxContext) {
  const openid = wxContext.OPENID

  try {
    // 获取用户信息
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
    const changeCount = user.discNameChangeCount || 0
    const changeHistory = user.discNameChangeHistory || []
    const lastChangeTime = user.lastDiscNameChangeTime

    return {
      success: true,
      data: {
        currentDiscName: user.discName || '',
        changeCount: changeCount,
        remainingChanges: Math.max(0, 3 - changeCount),
        canChange: changeCount < 3,
        changeHistory: changeHistory,
        lastChangeTime: lastChangeTime
      }
    }
  } catch (error) {
    console.error('获取盘名修改信息失败:', error)
    return {
      success: false,
      message: '获取信息失败',
      error: error.message
    }
  }
}

// 升级用户为管理员（特殊功能，用于解决角色分配问题）
async function upgradeToAdmin(event, wxContext) {
  const { targetDiscName, confirmCode } = event
  const openid = wxContext.OPENID

  try {
    // 安全验证码（防止误操作）
    const validCodes = ['FRISBEE_CAPTAIN_2025', 'ADMIN_UPGRADE_CODE']
    if (!confirmCode || !validCodes.includes(confirmCode)) {
      return {
        success: false,
        message: '验证码错误，无法升级权限'
      }
    }

    // 查找目标用户
    let targetUser = null
    if (targetDiscName) {
      // 根据盘名查找用户
      const userResult = await db.collection('Users').where({
        discName: targetDiscName
      }).get()

      if (userResult.data.length === 0) {
        return {
          success: false,
          message: `未找到盘名为"${targetDiscName}"的用户`
        }
      }
      targetUser = userResult.data[0]
    } else {
      // 升级当前用户
      const userResult = await db.collection('Users').where({
        _openid: openid
      }).get()

      if (userResult.data.length === 0) {
        return {
          success: false,
          message: '用户不存在'
        }
      }
      targetUser = userResult.data[0]
    }

    // 检查是否已经是管理员
    if (targetUser.role === 'admin') {
      return {
        success: false,
        message: `用户"${targetUser.discName || targetUser.nickName}"已经是管理员`
      }
    }

    // 升级为管理员
    await db.collection('Users').doc(targetUser._id).update({
      data: {
        role: 'admin',
        updateTime: new Date(),
        roleUpgradeTime: new Date(),
        roleUpgradeBy: openid
      }
    })

    console.log(`用户角色升级成功: ${targetUser.discName || targetUser.nickName} -> admin`)

    return {
      success: true,
      message: `用户"${targetUser.discName || targetUser.nickName}"已成功升级为管理员`,
      data: {
        userId: targetUser._id,
        discName: targetUser.discName,
        nickName: targetUser.nickName,
        oldRole: 'member',
        newRole: 'admin',
        upgradeTime: new Date()
      }
    }
  } catch (error) {
    console.error('升级用户角色失败:', error)
    return {
      success: false,
      message: '升级失败',
      error: error.message
    }
  }
}

// 检查用户角色信息
async function checkUserRole(event, wxContext) {
  const openid = wxContext.OPENID

  try {
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

    return {
      success: true,
      data: {
        userId: user._id,
        openid: user._openid,
        nickName: user.nickName,
        discName: user.discName,
        role: user.role,
        isAdmin: user.role === 'admin',
        isInfoCompleted: user.isInfoCompleted,
        createTime: user.createTime,
        updateTime: user.updateTime,
        roleUpgradeTime: user.roleUpgradeTime || null
      },
      message: '用户角色信息获取成功'
    }
  } catch (error) {
    console.error('检查用户角色失败:', error)
    return {
      success: false,
      message: '检查失败',
      error: error.message
    }
  }
}

// 更新用户信息（包括角色）
async function updateUserInfo(event, wxContext) {
  const { discName, role, confirmCode } = event
  const openid = wxContext.OPENID

  try {
    // 如果要修改角色，需要验证码
    if (role && role === 'admin') {
      const validCodes = ['FRISBEE_CAPTAIN_2025', 'ADMIN_UPGRADE_CODE']
      if (!confirmCode || !validCodes.includes(confirmCode)) {
        return {
          success: false,
          message: '修改管理员角色需要验证码'
        }
      }
    }

    // 获取当前用户信息
    const userResult = await db.collection('Users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    const currentUser = userResult.data[0]
    const updateData = {
      updateTime: new Date()
    }

    // 更新盘名
    if (discName && discName !== currentUser.discName) {
      updateData.discName = discName
      console.log(`更新用户盘名: ${currentUser.discName} -> ${discName}`)
    }

    // 更新角色
    if (role && role !== currentUser.role) {
      updateData.role = role
      updateData.roleUpgradeTime = new Date()
      updateData.roleUpgradeBy = openid
      console.log(`更新用户角色: ${currentUser.role} -> ${role}`)
    }

    // 执行更新
    await db.collection('Users').doc(currentUser._id).update({
      data: updateData
    })

    // 获取更新后的用户信息
    const updatedUserResult = await db.collection('Users').where({
      _openid: openid
    }).get()

    return {
      success: true,
      data: updatedUserResult.data[0],
      message: '用户信息更新成功'
    }
  } catch (error) {
    console.error('更新用户信息失败:', error)
    return {
      success: false,
      message: '更新失败',
      error: error.message
    }
  }
}
