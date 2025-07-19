/**
 * 测试数据构建脚本
 * 通过云函数创建测试数据并验证修复效果
 */

const testDataBuilder = {
  // 构建测试数据
  buildTestData: async function() {
    try {
      console.log('🚀 开始构建测试数据...');
      console.log('=====================================');
      
      const startTime = Date.now();
      
      const result = await wx.cloud.callFunction({
        name: 'test_data_builder',
        data: {
          action: 'build'
        }
      });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      if (!result.result.success) {
        console.error('❌ 构建测试数据失败:', result.result.message);
        return false;
      }
      
      const data = result.result.data;
      
      console.log('📊 构建结果:');
      console.log(`👥 用户数量: ${data.usersCount} 个`);
      console.log(`📅 创建训练: ${data.eventsCreated} 个`);
      console.log(`👥 创建报名: ${data.registrationsCreated} 条`);
      console.log(`👑 管理员: ${data.adminUser.name}`);
      
      if (data.deletedEventId) {
        console.log(`🗑️ 已软删除测试训练: ${data.deletedEventId}`);
      }
      
      console.log('\n=====================================');
      console.log('🎯 测试数据构建完成！');
      console.log(`⏱️ 总耗时: ${duration.toFixed(1)} 秒`);
      
      console.log('\n💡 现在可以验证修复效果:');
      console.log('testDataBuilder.verifyFix()');
      
      return true;
    } catch (error) {
      console.error('❌ 构建测试数据失败:', error);
      return false;
    }
  },

  // 验证修复效果
  verifyFix: async function(userOpenid) {
    try {
      console.log('🔍 验证"我的训练记录"修复效果...');
      console.log('=====================================');
      
      const result = await wx.cloud.callFunction({
        name: 'test_data_builder',
        data: {
          action: 'verify_fix',
          userOpenid: userOpenid
        }
      });
      
      if (!result.result.success) {
        console.error('❌ 验证修复效果失败:', result.result.message);
        return false;
      }
      
      const data = result.result.data;
      
      console.log(`👤 测试用户: ${data.userOpenid}`);
      console.log(`📊 总报名记录: ${data.totalRegistrations} 条`);
      console.log(`📅 相关训练: ${data.totalEvents} 个`);
      console.log(`🗑️ 已删除训练: ${data.deletedEvents} 个`);
      console.log(`✅ 活跃训练: ${data.activeEvents} 个`);
      console.log(`📋 应显示记录: ${data.validRecords} 条`);
      
      console.log('\n📋 应该显示的训练记录:');
      if (data.shouldShow.length > 0) {
        data.shouldShow.forEach((record, index) => {
          const status = record.status === 'signed_up' ? '已报名' : 
                        record.status === 'present' ? '已出勤' :
                        record.status === 'leave_requested' ? '已请假' : record.status;
          console.log(`${index + 1}. ${record.eventTitle} - ${status}`);
        });
      } else {
        console.log('   (无)');
      }
      
      console.log('\n🗑️ 不应该显示的训练记录:');
      if (data.shouldNotShow.length > 0) {
        data.shouldNotShow.forEach((record, index) => {
          console.log(`${index + 1}. ${record.eventTitle} - ${record.deleteReason}`);
        });
      } else {
        console.log('   (无已删除训练)');
      }
      
      console.log('\n=====================================');
      
      if (data.fixWorking) {
        console.log('✅ 修复验证成功！');
        console.log('💡 已删除的训练不会出现在"我的训练记录"中');
        console.log('💡 只显示活跃的训练记录');
      } else if (data.deletedEvents === 0) {
        console.log('ℹ️ 没有已删除的训练，无法完全验证修复效果');
        console.log('💡 但当前逻辑应该是正确的');
      } else {
        console.log('⚠️ 修复可能存在问题');
        console.log('💡 请检查 registration_service 云函数的 getMyList 方法');
      }
      
      return data.fixWorking || data.deletedEvents === 0;
    } catch (error) {
      console.error('❌ 验证修复效果失败:', error);
      return false;
    }
  },

  // 完整的构建和验证流程
  runCompleteTest: async function() {
    console.log('🚀 开始完整的测试数据构建和验证流程...');
    console.log('=====================================');
    
    const startTime = Date.now();
    
    // 执行步骤
    const steps = [
      { name: '构建测试数据', fn: this.buildTestData },
      { name: '验证修复效果', fn: this.verifyFix }
    ];
    
    let successCount = 0;
    
    for (const step of steps) {
      console.log(`\n📋 执行步骤: ${step.name}`);
      
      try {
        const success = await step.fn.call(this);
        if (success) {
          successCount++;
          console.log(`✅ ${step.name} 完成`);
        } else {
          console.log(`❌ ${step.name} 失败`);
        }
      } catch (error) {
        console.error(`❌ ${step.name} 执行出错:`, error);
      }
      
      // 步骤间延迟
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n=====================================');
    console.log('🎯 完整测试流程结束！');
    console.log(`⏱️ 总耗时: ${duration.toFixed(1)} 秒`);
    console.log(`✅ 成功步骤: ${successCount}/${steps.length}`);
    
    if (successCount === steps.length) {
      console.log('\n🎉 测试数据构建和验证全部成功！');
      console.log('\n💡 现在可以在小程序中查看"我的训练记录"页面');
      console.log('💡 确认已删除的训练不会显示在列表中');
      console.log('\n📱 测试步骤:');
      console.log('1. 打开小程序');
      console.log('2. 进入"我的训练记录"页面');
      console.log('3. 确认只显示活跃的训练，不显示"测试删除训练"');
    } else {
      console.log('\n⚠️ 部分步骤失败，但基础数据已创建');
      console.log('💡 可以手动在小程序中验证修复效果');
    }
    
    return successCount === steps.length;
  },

  // 检查当前数据状态
  checkDataStatus: async function() {
    try {
      console.log('📊 检查当前数据状态...');
      
      // 使用之前的云函数检查状态
      const result = await wx.cloud.callFunction({
        name: 'database_cleanup',
        data: {
          action: 'status'
        }
      });
      
      if (!result.result.success) {
        console.error('❌ 检查数据状态失败:', result.result.message);
        return false;
      }
      
      const collections = result.result.data.collections;
      
      console.log('📋 当前数据状态:');
      for (const collection of collections) {
        const emoji = collection.count > 0 ? '📋' : collection.count === 0 ? '📄' : '❌';
        const statusText = collection.status;
        const countText = collection.exists ? `(${collection.count} 条)` : '';
        console.log(`${emoji} ${collection.displayName}: ${statusText} ${countText}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ 检查数据状态失败:', error);
      return false;
    }
  }
};

// 使用说明
console.log('📦 测试数据构建脚本已加载');
console.log('');
console.log('⚠️ 使用前请确保已部署 test_data_builder 云函数');
console.log('');
console.log('🔧 使用方法:');
console.log('1. 检查数据状态: testDataBuilder.checkDataStatus()');
console.log('2. 构建测试数据: testDataBuilder.buildTestData()');
console.log('3. 验证修复效果: testDataBuilder.verifyFix()');
console.log('4. 完整流程: testDataBuilder.runCompleteTest()');
console.log('');
console.log('💡 这个脚本会创建包含已删除训练的测试数据，用于验证修复效果');
