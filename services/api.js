// services/api.js - API服务层
const { getConfig, getErrorMessage } = require('../config/index.js')
const { logger, handleError } = require('../utils/logger.js')

/**
 * API服务基类
 */
class ApiService {
  constructor() {
    this.timeout = getConfig('cloud.timeout', 10000)
  }

  /**
   * 调用云函数
   * @param {string} name 云函数名称
   * @param {object} data 参数
   * @returns {Promise} 调用结果
   */
  async callFunction(name, data) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(getErrorMessage('timeout')))
      }, this.timeout)

      wx.cloud.callFunction({
        name,
        data,
        success: (res) => {
          clearTimeout(timer)
          logger.info('ApiService', `云函数 ${name} 调用成功`, res.result)
          
          if (res.result && res.result.success) {
            resolve(res.result)
          } else {
            const error = new Error(res.result?.message || getErrorMessage('serverError'))
            error.code = res.result?.code
            reject(error)
          }
        },
        fail: (err) => {
          clearTimeout(timer)
          logger.error('ApiService', `云函数 ${name} 调用失败`, err)
          
          let errorMessage = getErrorMessage('network')
          if (err.errMsg) {
            if (err.errMsg.includes('timeout')) {
              errorMessage = getErrorMessage('timeout')
            } else if (err.errMsg.includes('permission')) {
              errorMessage = getErrorMessage('forbidden')
            }
          }
          
          const error = new Error(errorMessage)
          error.originalError = err
          reject(error)
        }
      })
    })
  }
}

/**
 * 用户服务API
 */
class UserService extends ApiService {
  constructor() {
    super()
    this.functionName = getConfig('cloudFunctions.userService')
  }

  /**
   * 用户登录
   * @param {string} nickName 用户昵称
   * @param {string} avatarUrl 头像URL
   * @returns {Promise<object>} 用户信息
   */
  async login(nickName, avatarUrl) {
    try {
      const result = await this.callFunction(this.functionName, {
        action: 'login',
        nickName,
        avatarUrl
      })
      return result.data
    } catch (error) {
      handleError(error, '用户登录')
      throw error
    }
  }

  /**
   * 获取用户信息
   * @param {string} openid 用户openid
   * @returns {Promise<object>} 用户信息
   */
  async getUserInfo(openid) {
    try {
      const result = await this.callFunction(this.functionName, {
        action: 'getUserInfo',
        openid
      })
      return result.data
    } catch (error) {
      handleError(error, '获取用户信息')
      throw error
    }
  }

  /**
   * 更新用户信息
   * @param {object} userInfo 用户信息
   * @returns {Promise<boolean>} 是否成功
   */
  async updateUserInfo(userInfo) {
    try {
      await this.callFunction(this.functionName, {
        action: 'updateUserInfo',
        ...userInfo
      })
      return true
    } catch (error) {
      handleError(error, '更新用户信息')
      throw error
    }
  }
}

/**
 * 训练活动服务API
 */
class EventService extends ApiService {
  constructor() {
    super()
    this.functionName = getConfig('cloudFunctions.eventService')
  }

  /**
   * 创建训练活动
   * @param {object} eventData 训练数据
   * @returns {Promise<string>} 活动ID
   */
  async createEvent(eventData) {
    try {
      const result = await this.callFunction(this.functionName, {
        action: 'create',
        ...eventData
      })
      return result.data._id
    } catch (error) {
      handleError(error, '创建训练活动')
      throw error
    }
  }

  /**
   * 获取训练列表
   * @param {object} options 查询选项
   * @returns {Promise<Array>} 训练列表
   */
  async getEventList(options = {}) {
    try {
      const result = await this.callFunction(this.functionName, {
        action: 'getList',
        ...options
      })
      return result.data
    } catch (error) {
      handleError(error, '获取训练列表')
      throw error
    }
  }

  /**
   * 获取训练详情
   * @param {string} eventId 训练ID
   * @returns {Promise<object>} 训练详情
   */
  async getEventDetail(eventId) {
    try {
      const result = await this.callFunction(this.functionName, {
        action: 'getDetail',
        eventId
      })
      return result.data
    } catch (error) {
      handleError(error, '获取训练详情')
      throw error
    }
  }

  /**
   * 更新训练活动
   * @param {string} eventId 训练ID
   * @param {object} updateData 更新数据
   * @returns {Promise<boolean>} 是否成功
   */
  async updateEvent(eventId, updateData) {
    try {
      await this.callFunction(this.functionName, {
        action: 'update',
        eventId,
        ...updateData
      })
      return true
    } catch (error) {
      handleError(error, '更新训练活动')
      throw error
    }
  }

  /**
   * 删除训练活动
   * @param {string} eventId 训练ID
   * @returns {Promise<boolean>} 是否成功
   */
  async deleteEvent(eventId) {
    try {
      await this.callFunction(this.functionName, {
        action: 'delete',
        eventId
      })
      return true
    } catch (error) {
      handleError(error, '删除训练活动')
      throw error
    }
  }
}

/**
 * 报名注册服务API
 */
class RegistrationService extends ApiService {
  constructor() {
    super()
    this.functionName = getConfig('cloudFunctions.registrationService')
  }

  /**
   * 用户报名/请假
   * @param {string} eventId 训练ID
   * @param {string} status 状态
   * @returns {Promise<string>} 报名记录ID
   */
  async register(eventId, status) {
    try {
      const result = await this.callFunction(this.functionName, {
        action: 'register',
        eventId,
        status
      })
      return result.data._id
    } catch (error) {
      handleError(error, '报名操作')
      throw error
    }
  }

  /**
   * 获取训练的报名列表
   * @param {string} eventId 训练ID
   * @returns {Promise<Array>} 报名列表
   */
  async getRegistrationList(eventId) {
    try {
      const result = await this.callFunction(this.functionName, {
        action: 'getListByEvent',
        eventId
      })
      return result.data
    } catch (error) {
      handleError(error, '获取报名列表')
      throw error
    }
  }

  /**
   * 获取我的报名记录
   * @returns {Promise<Array>} 我的报名记录
   */
  async getMyRegistrations() {
    try {
      const result = await this.callFunction(this.functionName, {
        action: 'getMyList'
      })
      return result.data
    } catch (error) {
      handleError(error, '获取我的报名记录')
      throw error
    }
  }

  /**
   * 更新出勤状态
   * @param {string} registrationId 报名记录ID
   * @param {string} status 出勤状态
   * @returns {Promise<boolean>} 是否成功
   */
  async updateAttendance(registrationId, status) {
    try {
      await this.callFunction(this.functionName, {
        action: 'updateAttendance',
        registrationId,
        status
      })
      return true
    } catch (error) {
      handleError(error, '更新出勤状态')
      throw error
    }
  }

  /**
   * 获取用户在某个活动的状态
   * @param {string} eventId 训练ID
   * @returns {Promise<object|null>} 用户状态
   */
  async getUserEventStatus(eventId) {
    try {
      const result = await this.callFunction(this.functionName, {
        action: 'getUserStatus',
        eventId
      })
      return result.data
    } catch (error) {
      handleError(error, '获取用户状态')
      throw error
    }
  }

  /**
   * 取消报名
   * @param {string} registrationId 报名记录ID
   * @returns {Promise<boolean>} 是否成功
   */
  async cancelRegistration(registrationId) {
    try {
      await this.callFunction(this.functionName, {
        action: 'cancel',
        registrationId
      })
      return true
    } catch (error) {
      handleError(error, '取消报名')
      throw error
    }
  }
}

// 创建服务实例
const userService = new UserService()
const eventService = new EventService()
const registrationService = new RegistrationService()

module.exports = {
  userService,
  eventService,
  registrationService,
  ApiService,
  UserService,
  EventService,
  RegistrationService
}
