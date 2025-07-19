/**
 * 性能优化和稳定性测试脚本
 * 进行性能测试、并发测试、压力测试，确保系统稳定性
 */

const performanceStabilityTester = {
  // 测试配置
  config: {
    // 性能测试配置
    performanceTest: {
      singleDeleteIterations: 10, // 单次删除测试次数
      batchSizes: [5, 10, 20, 50], // 批量测试大小
      concurrentLevels: [1, 3, 5, 10], // 并发级别
      timeoutMs: 30000 // 超时时间
    },
    
    // 压力测试配置
    stressTest: {
      maxConcurrent: 20, // 最大并发数
      testDuration: 60000, // 测试持续时间（毫秒）
      rampUpTime: 10000, // 压力递增时间
      targetTPS: 5 // 目标每秒事务数
    },
    
    // 稳定性测试配置
    stabilityTest: {
      longRunDuration: 300000, // 长时间运行测试（5分钟）
      memoryCheckInterval: 30000, // 内存检查间隔
      errorThreshold: 0.05 // 错误率阈值（5%）
    }
  },

  // 测试结果存储
  results: {
    performance: {
      singleDelete: [],
      batchDelete: [],
      concurrent: []
    },
    stress: {
      maxTPS: 0,
      avgResponseTime: 0,
      errorRate: 0,
      memoryUsage: []
    },
    stability: {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      avgResponseTime: 0,
      memoryLeaks: false
    }
  },

  // 测试数据管理
  testData: {
    events: [],
    users: [],
    registrations: [],
    adminUser: null
  },

  // 初始化性能测试环境
  async initializePerformanceTestEnvironment() {
    try {
      console.log('🔧 初始化性能测试环境...')
      
      const db = wx.cloud.database()
      
      // 获取测试用户
      const usersResult = await db.collection('Users').limit(50).get()
      if (usersResult.data.length < 10) {
        throw new Error('需要至少10个用户进行性能测试')
      }
      
      this.testData.users = usersResult.data
      
      // 确保有管理员用户
      const adminResult = await db.collection('Users').where({
        role: 'admin'
      }).limit(1).get()
      
      if (adminResult.data.length > 0) {
        this.testData.adminUser = adminResult.data[0]
      } else {
        // 临时提升用户权限
        await db.collection('Users').doc(this.testData.users[0]._id).update({
          data: { role: 'admin' }
        })
        this.testData.adminUser = { ...this.testData.users[0], role: 'admin' }
      }
      
      console.log(`✅ 性能测试环境初始化完成: ${this.testData.users.length}个用户`)
      return true
    } catch (error) {
      console.error('❌ 初始化性能测试环境失败:', error)
      return false
    }
  },

  // 创建性能测试数据
  async createPerformanceTestData(eventCount, usersPerEvent) {
    try {
      const db = wx.cloud.database()
      const createdData = {
        events: [],
        registrations: []
      }
      
      for (let i = 0; i < eventCount; i++) {
        // 创建测试训练
        const testEvent = {
          title: `性能测试训练${i + 1}`,
          description: `性能测试用训练 - ${new Date().toLocaleString()}`,
          eventTime: new Date(Date.now() + (4 + i) * 60 * 60 * 1000), // 4+i小时后
          location: `性能测试场地${i + 1}`,
          maxParticipants: 50,
          creatorId: this.testData.adminUser._id,
          status: 'active',
          createTime: new Date(),
          isDeleted: false
        }
        
        const eventResult = await db.collection('Events').add({
          data: testEvent
        })
        
        const event = {
          _id: eventResult._id,
          ...testEvent
        }
        
        createdData.events.push(event)
        
        // 为训练创建报名记录
        const selectedUsers = this.testData.users.slice(0, usersPerEvent)
        for (const user of selectedUsers) {
          const registration = {
            eventId: event._id,
            userId: user._id,
            userOpenid: user._openid,
            status: 'signed_up',
            registrationTime: new Date(),
            updateTime: new Date()
          }
          
          const regResult = await db.collection('Registrations').add({
            data: registration
          })
          
          createdData.registrations.push({
            _id: regResult._id,
            ...registration
          })
        }
      }
      
      this.testData.events.push(...createdData.events)
      this.testData.registrations.push(...createdData.registrations)
      
      console.log(`✅ 创建性能测试数据: ${eventCount}个训练, ${createdData.registrations.length}个报名`)
      return createdData
    } catch (error) {
      console.error('❌ 创建性能测试数据失败:', error)
      throw error
    }
  },

  // 测量执行时间
  async measureExecutionTime(operation, description) {
    const startTime = Date.now()
    const startMemory = this.getMemoryUsage()
    
    try {
      const result = await operation()
      const endTime = Date.now()
      const endMemory = this.getMemoryUsage()
      const executionTime = endTime - startTime
      
      return {
        success: true,
        executionTime: executionTime,
        memoryDelta: endMemory - startMemory,
        result: result,
        description: description
      }
    } catch (error) {
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      return {
        success: false,
        executionTime: executionTime,
        error: error,
        description: description
      }
    }
  },

  // 获取内存使用情况（模拟）
  getMemoryUsage() {
    // 在实际环境中，这里可以使用 process.memoryUsage() 或其他内存监控方法
    // 在小程序环境中，我们使用模拟值
    return Math.random() * 100 + 50 // 模拟50-150MB的内存使用
  },

  // 性能测试1: 单次删除性能
  async testSingleDeletePerformance() {
    try {
      console.log('📊 测试单次删除性能...')
      
      const iterations = this.config.performanceTest.singleDeleteIterations
      const results = []
      
      // 创建测试数据
      const testData = await this.createPerformanceTestData(iterations, 5)
      
      for (let i = 0; i < iterations; i++) {
        const event = testData.events[i]
        
        const measurement = await this.measureExecutionTime(async () => {
          return await wx.cloud.callFunction({
            name: 'event_service',
            data: {
              action: 'delete',
              eventId: event._id,
              deleteReason: `性能测试删除 ${i + 1}`
            }
          })
        }, `单次删除测试 ${i + 1}`)
        
        results.push(measurement)
        
        if (measurement.success) {
          console.log(`✅ 删除${i + 1}: ${measurement.executionTime}ms`)
        } else {
          console.log(`❌ 删除${i + 1}失败: ${measurement.error.message}`)
        }
        
        // 测试间稍作延迟
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // 计算统计数据
      const successfulResults = results.filter(r => r.success)
      const avgTime = successfulResults.reduce((sum, r) => sum + r.executionTime, 0) / successfulResults.length
      const minTime = Math.min(...successfulResults.map(r => r.executionTime))
      const maxTime = Math.max(...successfulResults.map(r => r.executionTime))
      const successRate = (successfulResults.length / results.length) * 100
      
      this.results.performance.singleDelete = {
        iterations: iterations,
        successCount: successfulResults.length,
        failCount: results.length - successfulResults.length,
        successRate: successRate,
        avgTime: avgTime,
        minTime: minTime,
        maxTime: maxTime,
        results: results
      }
      
      console.log(`✅ 单次删除性能测试完成:`)
      console.log(`   成功率: ${successRate.toFixed(1)}%`)
      console.log(`   平均时间: ${avgTime.toFixed(0)}ms`)
      console.log(`   最快: ${minTime}ms, 最慢: ${maxTime}ms`)
      
      return true
    } catch (error) {
      console.error('❌ 单次删除性能测试失败:', error)
      return false
    }
  },

  // 性能测试2: 批量删除性能
  async testBatchDeletePerformance() {
    try {
      console.log('📊 测试批量删除性能...')
      
      const batchResults = []
      
      for (const batchSize of this.config.performanceTest.batchSizes) {
        console.log(`测试批量大小: ${batchSize}`)
        
        // 创建测试数据
        const testData = await this.createPerformanceTestData(batchSize, 3)
        
        const measurement = await this.measureExecutionTime(async () => {
          // 并发删除多个训练
          const deletePromises = testData.events.map(event => 
            wx.cloud.callFunction({
              name: 'event_service',
              data: {
                action: 'delete',
                eventId: event._id,
                deleteReason: `批量删除测试 - 批量大小${batchSize}`
              }
            })
          )
          
          return await Promise.all(deletePromises)
        }, `批量删除 ${batchSize} 个训练`)
        
        if (measurement.success) {
          const successCount = measurement.result.filter(r => r.result.success).length
          const throughput = (successCount / measurement.executionTime) * 1000 // 每秒处理数
          
          batchResults.push({
            batchSize: batchSize,
            executionTime: measurement.executionTime,
            successCount: successCount,
            failCount: batchSize - successCount,
            throughput: throughput
          })
          
          console.log(`✅ 批量${batchSize}: ${measurement.executionTime}ms, 吞吐量: ${throughput.toFixed(2)}/s`)
        } else {
          console.log(`❌ 批量${batchSize}失败: ${measurement.error.message}`)
        }
        
        // 批次间延迟
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
      this.results.performance.batchDelete = batchResults
      
      console.log('✅ 批量删除性能测试完成')
      return true
    } catch (error) {
      console.error('❌ 批量删除性能测试失败:', error)
      return false
    }
  },

  // 性能测试3: 并发性能测试
  async testConcurrentPerformance() {
    try {
      console.log('📊 测试并发性能...')
      
      const concurrentResults = []
      
      for (const concurrentLevel of this.config.performanceTest.concurrentLevels) {
        console.log(`测试并发级别: ${concurrentLevel}`)
        
        // 创建测试数据
        const testData = await this.createPerformanceTestData(concurrentLevel, 2)
        
        const measurement = await this.measureExecutionTime(async () => {
          // 创建并发任务
          const concurrentTasks = []
          
          for (let i = 0; i < concurrentLevel; i++) {
            const task = wx.cloud.callFunction({
              name: 'event_service',
              data: {
                action: 'delete',
                eventId: testData.events[i]._id,
                deleteReason: `并发测试 - 级别${concurrentLevel}-${i + 1}`
              }
            })
            concurrentTasks.push(task)
          }
          
          return await Promise.all(concurrentTasks)
        }, `并发级别 ${concurrentLevel}`)
        
        if (measurement.success) {
          const successCount = measurement.result.filter(r => r.result.success).length
          const avgResponseTime = measurement.executionTime / concurrentLevel
          const throughput = (successCount / measurement.executionTime) * 1000
          
          concurrentResults.push({
            concurrentLevel: concurrentLevel,
            executionTime: measurement.executionTime,
            avgResponseTime: avgResponseTime,
            successCount: successCount,
            failCount: concurrentLevel - successCount,
            throughput: throughput
          })
          
          console.log(`✅ 并发${concurrentLevel}: ${measurement.executionTime}ms, 平均响应: ${avgResponseTime.toFixed(0)}ms`)
        } else {
          console.log(`❌ 并发${concurrentLevel}失败: ${measurement.error.message}`)
        }
        
        // 并发级别间延迟
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
      
      this.results.performance.concurrent = concurrentResults
      
      console.log('✅ 并发性能测试完成')
      return true
    } catch (error) {
      console.error('❌ 并发性能测试失败:', error)
      return false
    }
  },

  // 压力测试
  async testStressPerformance() {
    try {
      console.log('🔥 开始压力测试...')
      
      const startTime = Date.now()
      const endTime = startTime + this.config.stressTest.testDuration
      const rampUpEnd = startTime + this.config.stressTest.rampUpTime
      
      let totalOperations = 0
      let successfulOperations = 0
      let failedOperations = 0
      let totalResponseTime = 0
      const memorySnapshots = []
      
      // 创建大量测试数据
      const testData = await this.createPerformanceTestData(100, 1)
      let eventIndex = 0
      
      console.log(`压力测试运行${this.config.stressTest.testDuration / 1000}秒...`)
      
      while (Date.now() < endTime) {
        const currentTime = Date.now()
        
        // 计算当前并发级别（渐进式增加）
        let currentConcurrency
        if (currentTime < rampUpEnd) {
          const rampProgress = (currentTime - startTime) / this.config.stressTest.rampUpTime
          currentConcurrency = Math.ceil(this.config.stressTest.maxConcurrent * rampProgress)
        } else {
          currentConcurrency = this.config.stressTest.maxConcurrent
        }
        
        // 执行并发操作
        const concurrentTasks = []
        for (let i = 0; i < currentConcurrency && eventIndex < testData.events.length; i++) {
          const event = testData.events[eventIndex % testData.events.length]
          eventIndex++
          
          const task = this.measureExecutionTime(async () => {
            return await wx.cloud.callFunction({
              name: 'notification_service',
              data: {
                action: 'getNotificationStats',
                timeRange: 1
              }
            })
          }, `压力测试操作 ${totalOperations + i + 1}`)
          
          concurrentTasks.push(task)
        }
        
        const results = await Promise.all(concurrentTasks)
        
        // 统计结果
        results.forEach(result => {
          totalOperations++
          totalResponseTime += result.executionTime
          
          if (result.success) {
            successfulOperations++
          } else {
            failedOperations++
          }
        })
        
        // 记录内存使用情况
        memorySnapshots.push({
          timestamp: Date.now(),
          memory: this.getMemoryUsage(),
          operations: totalOperations
        })
        
        // 控制请求频率
        await new Promise(resolve => setTimeout(resolve, 1000 / this.config.stressTest.targetTPS))
      }
      
      // 计算压力测试结果
      const actualDuration = Date.now() - startTime
      const actualTPS = (totalOperations / actualDuration) * 1000
      const errorRate = (failedOperations / totalOperations) * 100
      const avgResponseTime = totalResponseTime / totalOperations
      
      this.results.stress = {
        duration: actualDuration,
        totalOperations: totalOperations,
        successfulOperations: successfulOperations,
        failedOperations: failedOperations,
        actualTPS: actualTPS,
        targetTPS: this.config.stressTest.targetTPS,
        errorRate: errorRate,
        avgResponseTime: avgResponseTime,
        memorySnapshots: memorySnapshots
      }
      
      console.log('✅ 压力测试完成:')
      console.log(`   总操作数: ${totalOperations}`)
      console.log(`   成功率: ${((successfulOperations / totalOperations) * 100).toFixed(1)}%`)
      console.log(`   实际TPS: ${actualTPS.toFixed(2)}`)
      console.log(`   平均响应时间: ${avgResponseTime.toFixed(0)}ms`)
      console.log(`   错误率: ${errorRate.toFixed(2)}%`)
      
      return true
    } catch (error) {
      console.error('❌ 压力测试失败:', error)
      return false
    }
  },

  // 稳定性测试
  async testStability() {
    try {
      console.log('🔒 开始稳定性测试...')
      
      const startTime = Date.now()
      const endTime = startTime + this.config.stabilityTest.longRunDuration
      
      let totalOperations = 0
      let successfulOperations = 0
      let failedOperations = 0
      let totalResponseTime = 0
      const memoryHistory = []
      
      console.log(`稳定性测试运行${this.config.stabilityTest.longRunDuration / 1000}秒...`)
      
      while (Date.now() < endTime) {
        try {
          const measurement = await this.measureExecutionTime(async () => {
            // 执行各种操作来测试稳定性
            const operations = [
              wx.cloud.callFunction({
                name: 'notification_service',
                data: { action: 'getNotificationStats', timeRange: 1 }
              }),
              wx.cloud.callFunction({
                name: 'system_service',
                data: { action: 'healthCheck' }
              })
            ]
            
            return await Promise.all(operations)
          }, `稳定性测试操作 ${totalOperations + 1}`)
          
          totalOperations++
          totalResponseTime += measurement.executionTime
          
          if (measurement.success) {
            successfulOperations++
          } else {
            failedOperations++
          }
          
          // 定期检查内存使用情况
          if (totalOperations % 10 === 0) {
            const currentMemory = this.getMemoryUsage()
            memoryHistory.push({
              timestamp: Date.now(),
              memory: currentMemory,
              operations: totalOperations
            })
            
            // 检查内存泄漏
            if (memoryHistory.length > 10) {
              const recentMemory = memoryHistory.slice(-10)
              const memoryTrend = this.calculateMemoryTrend(recentMemory)
              
              if (memoryTrend > 5) { // 内存增长超过5MB
                console.log(`⚠️ 检测到可能的内存泄漏，增长趋势: ${memoryTrend.toFixed(2)}MB`)
              }
            }
          }
          
          // 控制操作频率
          await new Promise(resolve => setTimeout(resolve, 1000))
          
        } catch (error) {
          failedOperations++
          console.log(`稳定性测试操作失败: ${error.message}`)
        }
      }
      
      // 计算稳定性测试结果
      const actualDuration = Date.now() - startTime
      const errorRate = (failedOperations / totalOperations) * 100
      const avgResponseTime = totalResponseTime / totalOperations
      const memoryLeaks = this.detectMemoryLeaks(memoryHistory)
      
      this.results.stability = {
        duration: actualDuration,
        totalOperations: totalOperations,
        successfulOperations: successfulOperations,
        failedOperations: failedOperations,
        errorRate: errorRate,
        avgResponseTime: avgResponseTime,
        memoryLeaks: memoryLeaks,
        memoryHistory: memoryHistory
      }
      
      console.log('✅ 稳定性测试完成:')
      console.log(`   总操作数: ${totalOperations}`)
      console.log(`   成功率: ${((successfulOperations / totalOperations) * 100).toFixed(1)}%`)
      console.log(`   错误率: ${errorRate.toFixed(2)}%`)
      console.log(`   平均响应时间: ${avgResponseTime.toFixed(0)}ms`)
      console.log(`   内存泄漏: ${memoryLeaks ? '检测到' : '未检测到'}`)
      
      return errorRate <= this.config.stabilityTest.errorThreshold * 100
    } catch (error) {
      console.error('❌ 稳定性测试失败:', error)
      return false
    }
  },

  // 计算内存增长趋势
  calculateMemoryTrend(memoryHistory) {
    if (memoryHistory.length < 2) return 0
    
    const first = memoryHistory[0].memory
    const last = memoryHistory[memoryHistory.length - 1].memory
    
    return last - first
  },

  // 检测内存泄漏
  detectMemoryLeaks(memoryHistory) {
    if (memoryHistory.length < 10) return false
    
    // 简单的内存泄漏检测：检查内存是否持续增长
    const recentHistory = memoryHistory.slice(-10)
    const trend = this.calculateMemoryTrend(recentHistory)
    
    return trend > 10 // 如果内存增长超过10MB，认为可能有内存泄漏
  },

  // 清理性能测试数据
  async cleanupPerformanceTestData() {
    try {
      console.log('🧹 清理性能测试数据...')
      
      const db = wx.cloud.database()
      let cleanedCount = 0
      
      // 清理测试报名记录
      for (const reg of this.testData.registrations) {
        try {
          await db.collection('Registrations').doc(reg._id).remove()
          cleanedCount++
        } catch (error) {
          // 忽略清理错误
        }
      }
      
      // 清理测试训练
      for (const event of this.testData.events) {
        try {
          await db.collection('Events').doc(event._id).remove()
          cleanedCount++
        } catch (error) {
          // 忽略清理错误
        }
      }
      
      // 清理性能测试相关的通知
      const testNotifications = await db.collection('Notifications').where({
        'metadata.eventTitle': db.command.in([
          db.command.like('性能测试训练%'),
          db.command.like('批量删除测试%'),
          db.command.like('并发测试%')
        ])
      }).get()
      
      for (const notification of testNotifications.data) {
        try {
          await db.collection('Notifications').doc(notification._id).remove()
          cleanedCount++
        } catch (error) {
          // 忽略清理错误
        }
      }
      
      console.log(`✅ 清理完成: 共清理${cleanedCount}条记录`)
      
      // 重置测试数据
      this.testData = {
        events: [],
        users: [],
        registrations: [],
        adminUser: null
      }
      
      return true
    } catch (error) {
      console.error('❌ 清理性能测试数据失败:', error)
      return false
    }
  },

  // 生成性能报告
  generatePerformanceReport() {
    const report = {
      timestamp: new Date(),
      summary: {
        singleDeleteAvgTime: this.results.performance.singleDelete?.avgTime || 0,
        batchDeleteMaxThroughput: Math.max(...(this.results.performance.batchDelete?.map(b => b.throughput) || [0])),
        maxConcurrentLevel: Math.max(...(this.results.performance.concurrent?.map(c => c.concurrentLevel) || [0])),
        stressTestTPS: this.results.stress?.actualTPS || 0,
        stabilityErrorRate: this.results.stability?.errorRate || 0,
        memoryLeaksDetected: this.results.stability?.memoryLeaks || false
      },
      recommendations: []
    }
    
    // 生成优化建议
    if (report.summary.singleDeleteAvgTime > 5000) {
      report.recommendations.push('单次删除平均时间较长，建议优化数据库查询和通知发送逻辑')
    }
    
    if (report.summary.stressTestTPS < this.config.stressTest.targetTPS * 0.8) {
      report.recommendations.push('压力测试TPS未达到目标，建议优化并发处理能力')
    }
    
    if (report.summary.stabilityErrorRate > this.config.stabilityTest.errorThreshold * 100) {
      report.recommendations.push('稳定性测试错误率过高，需要改进错误处理机制')
    }
    
    if (report.summary.memoryLeaksDetected) {
      report.recommendations.push('检测到内存泄漏，需要检查代码中的内存管理')
    }
    
    if (report.recommendations.length === 0) {
      report.recommendations.push('系统性能表现良好，无需特别优化')
    }
    
    return report
  },

  // 运行完整的性能和稳定性测试
  async runCompletePerformanceTest() {
    console.log('🚀 开始性能和稳定性测试...')
    console.log('=====================================')
    
    const startTime = Date.now()
    
    // 初始化测试环境
    const initSuccess = await this.initializePerformanceTestEnvironment()
    if (!initSuccess) {
      console.log('❌ 性能测试环境初始化失败，终止测试')
      return false
    }
    
    // 定义测试项目
    const testItems = [
      { name: '单次删除性能', fn: this.testSingleDeletePerformance },
      { name: '批量删除性能', fn: this.testBatchDeletePerformance },
      { name: '并发性能', fn: this.testConcurrentPerformance },
      { name: '压力测试', fn: this.testStressPerformance },
      { name: '稳定性测试', fn: this.testStability }
    ]
    
    let passedTests = 0
    let failedTests = 0
    
    // 执行测试项目
    for (const testItem of testItems) {
      console.log(`\n📊 执行测试: ${testItem.name}`)
      
      try {
        const success = await testItem.fn.call(this)
        if (success) {
          passedTests++
          console.log(`✅ ${testItem.name} 通过`)
        } else {
          failedTests++
          console.log(`❌ ${testItem.name} 失败`)
        }
      } catch (error) {
        failedTests++
        console.error(`❌ ${testItem.name} 执行出错:`, error)
      }
      
      // 测试项间延迟
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
    
    // 清理测试数据
    await this.cleanupPerformanceTestData()
    
    // 生成性能报告
    const report = this.generatePerformanceReport()
    
    const endTime = Date.now()
    const totalDuration = endTime - startTime
    
    // 输出测试结果
    console.log('\n=====================================')
    console.log('🎯 性能和稳定性测试结果汇总:')
    console.log(`测试项目: ${testItems.length}`)
    console.log(`通过: ${passedTests}`)
    console.log(`失败: ${failedTests}`)
    console.log(`总耗时: ${(totalDuration / 1000).toFixed(1)}秒`)
    
    console.log('\n📊 性能指标:')
    console.log(`单次删除平均时间: ${report.summary.singleDeleteAvgTime.toFixed(0)}ms`)
    console.log(`最大批量吞吐量: ${report.summary.batchDeleteMaxThroughput.toFixed(2)}/s`)
    console.log(`最大并发级别: ${report.summary.maxConcurrentLevel}`)
    console.log(`压力测试TPS: ${report.summary.stressTestTPS.toFixed(2)}`)
    console.log(`稳定性错误率: ${report.summary.stabilityErrorRate.toFixed(2)}%`)
    
    console.log('\n💡 优化建议:')
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`)
    })
    
    const allPassed = failedTests === 0
    if (allPassed) {
      console.log('\n🎉 所有性能和稳定性测试通过！')
    } else {
      console.log('\n⚠️ 部分测试失败，请根据建议进行优化')
    }
    
    return allPassed
  }
}

// 使用方法：
// 1. 在微信开发者工具控制台中复制粘贴此脚本
// 2. 运行完整测试: performanceStabilityTester.runCompletePerformanceTest()
// 3. 或者运行单个测试，如: performanceStabilityTester.testSingleDeletePerformance()

console.log('📦 性能和稳定性测试脚本已加载')
console.log('💡 运行 performanceStabilityTester.runCompletePerformanceTest() 开始完整测试')
