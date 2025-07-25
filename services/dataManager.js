// services/dataManager.js - 数据管理器
const { StorageUtils } = require('../utils/common.js')
const { getConfig } = require('../config/index.js')
const { logger } = require('../utils/logger.js')

/**
 * 数据管理器基类
 */
class DataManager {
  constructor(key, cacheTime = 0) {
    this.storageKey = key
    this.cacheTime = cacheTime
    this.data = null
    this.lastUpdateTime = 0
  }

  /**
   * 检查缓存是否有效
   * @returns {boolean} 缓存是否有效
   */
  isCacheValid() {
    if (!this.cacheTime) return false
    return Date.now() - this.lastUpdateTime < this.cacheTime
  }

  /**
   * 获取数据
   * @param {boolean} forceRefresh 是否强制刷新
   * @returns {any} 数据
   */
  getData(forceRefresh = false) {
    if (!forceRefresh && this.data && this.isCacheValid()) {
      logger.info('DataManager', `从缓存获取数据: ${this.storageKey}`)
      return this.data
    }

    // 从本地存储获取
    const storedData = StorageUtils.get(this.storageKey)
    if (storedData && storedData.data && storedData.timestamp) {
      if (!forceRefresh && this.cacheTime && Date.now() - storedData.timestamp < this.cacheTime) {
        this.data = storedData.data
        this.lastUpdateTime = storedData.timestamp
        logger.info('DataManager', `从本地存储获取数据: ${this.storageKey}`)
        return this.data
      }
    }

    return null
  }

  /**
   * 设置数据
   * @param {any} data 数据
   * @param {boolean} saveToStorage 是否保存到本地存储
   */
  setData(data, saveToStorage = true) {
    this.data = data
    this.lastUpdateTime = Date.now()

    if (saveToStorage) {
      const storageData = {
        data: data,
        timestamp: this.lastUpdateTime
      }
      StorageUtils.set(this.storageKey, storageData)
      logger.info('DataManager', `数据已保存到本地存储: ${this.storageKey}`)
    }
  }

  /**
   * 清除数据
   */
  clearData() {
    this.data = null
    this.lastUpdateTime = 0
    StorageUtils.remove(this.storageKey)
    logger.info('DataManager', `数据已清除: ${this.storageKey}`)
  }

  /**
   * 更新数据中的某个项目
   * @param {Function} updateFn 更新函数
   * @param {boolean} saveToStorage 是否保存到本地存储
   */
  updateData(updateFn, saveToStorage = true) {
    if (this.data) {
      this.data = updateFn(this.data)
      this.lastUpdateTime = Date.now()

      if (saveToStorage) {
        const storageData = {
          data: this.data,
          timestamp: this.lastUpdateTime
        }
        StorageUtils.set(this.storageKey, storageData)
      }
    }
  }
}

/**
 * 用户数据管理器
 */
class UserDataManager extends DataManager {
  constructor() {
    super('userInfo', getConfig('cache.userInfo'))
  }

  /**
   * 获取当前用户信息
   * @returns {object|null} 用户信息
   */
  getCurrentUser() {
    return this.getData()
  }

  /**
   * 设置当前用户信息
   * @param {object} userInfo 用户信息
   */
  setCurrentUser(userInfo) {
    this.setData(userInfo)
    
    // 同时更新全局数据
    const app = getApp()
    if (app) {
      app.globalData.userInfo = userInfo
      app.globalData.isLoggedIn = true
    }
  }

  /**
   * 清除用户信息（退出登录）
   */
  clearCurrentUser() {
    this.clearData()
    
    // 同时清除全局数据
    const app = getApp()
    if (app) {
      app.globalData.userInfo = null
      app.globalData.isLoggedIn = false
    }
  }

  /**
   * 检查用户是否已登录
   * @returns {boolean} 是否已登录
   */
  isLoggedIn() {
    const userInfo = this.getCurrentUser()
    return userInfo && userInfo._openid
  }

  /**
   * 检查用户是否为管理员
   * @returns {boolean} 是否为管理员
   */
  isAdmin() {
    const userInfo = this.getCurrentUser()
    return userInfo && userInfo.role === getConfig('roles.admin')
  }

  /**
   * 获取用户角色
   * @returns {string} 用户角色
   */
  getUserRole() {
    const userInfo = this.getCurrentUser()
    return userInfo ? userInfo.role : null
  }
}

/**
 * 训练活动数据管理器
 */
class EventDataManager extends DataManager {
  constructor() {
    super('eventList', getConfig('cache.eventList'))
  }

  /**
   * 获取训练列表
   * @param {boolean} forceRefresh 是否强制刷新
   * @returns {Array} 训练列表
   */
  getEventList(forceRefresh = false) {
    return this.getData(forceRefresh) || []
  }

  /**
   * 设置训练列表
   * @param {Array} eventList 训练列表
   */
  setEventList(eventList) {
    this.setData(eventList)
  }

  /**
   * 添加训练活动
   * @param {object} event 训练活动
   */
  addEvent(event) {
    this.updateData(eventList => {
      return [event, ...eventList]
    })
  }

  /**
   * 更新训练活动
   * @param {string} eventId 训练ID
   * @param {object} updateData 更新数据
   */
  updateEvent(eventId, updateData) {
    this.updateData(eventList => {
      return eventList.map(event => 
        event._id === eventId ? { ...event, ...updateData } : event
      )
    })
  }

  /**
   * 删除训练活动
   * @param {string} eventId 训练ID
   */
  removeEvent(eventId) {
    this.updateData(eventList => {
      return eventList.filter(event => event._id !== eventId)
    })
  }

  /**
   * 根据ID获取训练活动
   * @param {string} eventId 训练ID
   * @returns {object|null} 训练活动
   */
  getEventById(eventId) {
    const eventList = this.getEventList()
    return eventList.find(event => event._id === eventId) || null
  }

  /**
   * 获取即将开始的训练
   * @param {number} days 天数
   * @returns {Array} 即将开始的训练列表
   */
  getUpcomingEvents(days = 7) {
    const eventList = this.getEventList()
    const now = new Date()
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    
    return eventList.filter(event => {
      const eventTime = new Date(event.eventTime)
      return eventTime >= now && eventTime <= futureDate && event.status === 'registering'
    }).sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime))
  }
}

/**
 * 报名数据管理器
 */
class RegistrationDataManager extends DataManager {
  constructor() {
    super('myRegistrations', getConfig('cache.userInfo'))
  }

  /**
   * 获取我的报名记录
   * @param {boolean} forceRefresh 是否强制刷新
   * @returns {Array} 报名记录列表
   */
  getMyRegistrations(forceRefresh = false) {
    return this.getData(forceRefresh) || []
  }

  /**
   * 设置我的报名记录
   * @param {Array} registrations 报名记录列表
   */
  setMyRegistrations(registrations) {
    this.setData(registrations)
  }

  /**
   * 添加报名记录
   * @param {object} registration 报名记录
   */
  addRegistration(registration) {
    this.updateData(registrations => {
      return [registration, ...registrations]
    })
  }

  /**
   * 更新报名记录
   * @param {string} registrationId 报名记录ID
   * @param {object} updateData 更新数据
   */
  updateRegistration(registrationId, updateData) {
    this.updateData(registrations => {
      return registrations.map(reg => 
        reg._id === registrationId ? { ...reg, ...updateData } : reg
      )
    })
  }

  /**
   * 获取某个活动的报名状态
   * @param {string} eventId 活动ID
   * @returns {object|null} 报名记录
   */
  getEventRegistration(eventId) {
    const registrations = this.getMyRegistrations()
    return registrations.find(reg => reg.eventId === eventId) || null
  }

  /**
   * 计算出勤统计
   * @returns {object} 出勤统计
   */
  getAttendanceStats() {
    const registrations = this.getMyRegistrations()
    // 统计状态为 'signed_up' 的记录作为报名训练数
    const signedUpEvents = registrations.filter(reg => reg.status === 'signed_up').length
    // 统计状态为 'present' 的记录作为实际出勤数
    const attendedEvents = registrations.filter(reg => reg.status === 'present').length
    // 总报名训练次数 = 已报名 + 已出勤（因为出勤的记录原本也是报名的）
    const totalEvents = signedUpEvents + attendedEvents
    // 出勤率 = 实际出勤次数 / 总报名训练次数
    const attendanceRate = totalEvents > 0 ? Math.round((attendedEvents / totalEvents) * 100) : 0

    return {
      totalEvents,
      attendedEvents,
      attendanceRate
    }
  }
}

// 创建全局实例
const userDataManager = new UserDataManager()
const eventDataManager = new EventDataManager()
const registrationDataManager = new RegistrationDataManager()

module.exports = {
  DataManager,
  UserDataManager,
  EventDataManager,
  RegistrationDataManager,
  userDataManager,
  eventDataManager,
  registrationDataManager
}
