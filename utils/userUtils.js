// utils/userUtils.js - 用户相关工具函数

/**
 * 获取用户显示名称
 * 优先显示盘名，如果盘名为空则显示微信昵称
 * @param {object} userInfo 用户信息对象
 * @returns {string} 显示名称
 */
function getUserDisplayName(userInfo) {
  if (!userInfo) {
    return '未知用户'
  }
  
  // 优先使用盘名
  if (userInfo.discName && userInfo.discName.trim() !== '') {
    return userInfo.discName.trim()
  }
  
  // 如果盘名为空，使用微信昵称
  if (userInfo.nickName && userInfo.nickName.trim() !== '') {
    return userInfo.nickName.trim()
  }
  
  // 都为空的情况
  return '未知用户'
}

/**
 * 获取用户角色显示文本
 * @param {string} role 用户角色
 * @returns {string} 角色显示文本
 */
function getUserRoleText(role) {
  const roleMap = {
    'admin': '队长',
    'member': '队员'
  }
  return roleMap[role] || '未知角色'
}

/**
 * 检查用户信息是否完善
 * @param {object} userInfo 用户信息对象
 * @returns {boolean} 是否完善
 */
function isUserInfoCompleted(userInfo) {
  if (!userInfo) {
    return false
  }
  
  return userInfo.isInfoCompleted === true &&
         userInfo.gender &&
         userInfo.institute &&
         userInfo.realName &&
         userInfo.discName &&
         userInfo.contactInfo
}

/**
 * 格式化用户信息用于显示
 * @param {object} userInfo 用户信息对象
 * @returns {object} 格式化后的用户信息
 */
function formatUserInfoForDisplay(userInfo) {
  if (!userInfo) {
    return {
      displayName: '未知用户',
      roleText: '未知角色',
      isInfoCompleted: false
    }
  }
  
  return {
    ...userInfo,
    displayName: getUserDisplayName(userInfo),
    roleText: getUserRoleText(userInfo.role),
    isInfoCompleted: isUserInfoCompleted(userInfo)
  }
}

module.exports = {
  getUserDisplayName,
  getUserRoleText,
  isUserInfoCompleted,
  formatUserInfoForDisplay
}
