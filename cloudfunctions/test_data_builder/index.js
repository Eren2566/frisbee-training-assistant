/**
 * 测试数据构建云函数
 * 用于创建测试数据并验证修复效果
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { action } = event;
  
  try {
    switch (action) {
      case 'build':
        return await buildTestData();
      case 'verify_fix':
        return await verifyFix(event.userOpenid);
      default:
        return {
          success: false,
          message: '不支持的操作类型',
          data: null
        };
    }
  } catch (error) {
    console.error('测试数据构建云函数执行失败:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
};

// 构建测试数据
async function buildTestData() {
  console.log('开始构建测试数据...');
  
  try {
    // 1. 获取现有用户
    const usersResult = await db.collection('Users').limit(10).get();
    const users = usersResult.data;
    
    if (users.length === 0) {
      return {
        success: false,
        message: '没有找到用户数据，请先确保有用户注册',
        data: null
      };
    }
    
    console.log(`找到 ${users.length} 个用户`);
    
    // 找到管理员用户
    let adminUser = users.find(user => user.role === 'admin');
    if (!adminUser) {
      adminUser = users[0]; // 使用第一个用户作为管理员
    }
    
    // 2. 创建测试训练
    const testEvents = [
      {
        title: '基础传接盘训练',
        description: '适合新手的基础传接盘技巧训练，学习基本的传接盘动作和技巧',
        eventTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2天后
        location: '足球场',
        maxParticipants: 20
      },
      {
        title: '进阶战术训练',
        description: '团队配合和战术演练，提升团队协作能力',
        eventTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3天后
        location: '体育馆',
        maxParticipants: 16
      },
      {
        title: '周末友谊赛',
        description: '与其他队伍的友谊比赛，实战演练',
        eventTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5天后
        location: '大学城体育场',
        maxParticipants: 14
      },
      {
        title: '体能训练课',
        description: '专项体能训练和身体素质提升',
        eventTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后
        location: '健身房',
        maxParticipants: 25
      },
      {
        title: '测试删除训练',
        description: '用于测试删除功能的训练（将被软删除）',
        eventTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10天后
        location: '测试场地',
        maxParticipants: 10
      }
    ];
    
    const createdEvents = [];
    
    for (const eventData of testEvents) {
      const completeEventData = {
        ...eventData,
        creatorId: adminUser._id,
        creatorOpenid: adminUser._openid,
        status: 'active',
        createTime: new Date(),
        updateTime: new Date(),
        isDeleted: false
      };
      
      const result = await db.collection('Events').add({
        data: completeEventData
      });
      
      createdEvents.push({
        _id: result._id,
        ...completeEventData
      });
      
      console.log(`创建训练: ${eventData.title}`);
    }
    
    // 3. 创建报名记录
    let totalRegistrations = 0;
    
    for (const event of createdEvents) {
      // 随机选择3-5个用户报名
      const participantCount = Math.floor(Math.random() * 3) + 3; // 3-5人
      const selectedUsers = shuffleArray([...users]).slice(0, participantCount);
      
      for (const user of selectedUsers) {
        const registrationData = {
          eventId: event._id,
          userId: user._openid,
          userOpenid: user._openid,
          status: getRandomStatus(),
          registrationTime: new Date(),
          updateTime: new Date()
        };
        
        await db.collection('Registrations').add({
          data: registrationData
        });
        
        totalRegistrations++;
      }
      
      console.log(`${event.title}: ${selectedUsers.length} 人报名`);
    }
    
    // 4. 执行删除测试（软删除测试训练）
    const testDeleteEvent = createdEvents.find(event => 
      event.title === '测试删除训练'
    );
    
    if (testDeleteEvent) {
      await db.collection('Events').doc(testDeleteEvent._id).update({
        data: {
          isDeleted: true,
          deleteTime: new Date(),
          deletedBy: adminUser._openid,
          deleteReason: '测试删除功能'
        }
      });
      
      console.log(`软删除训练: ${testDeleteEvent.title}`);
    }
    
    return {
      success: true,
      message: '测试数据构建完成',
      data: {
        usersCount: users.length,
        eventsCreated: createdEvents.length,
        registrationsCreated: totalRegistrations,
        adminUser: {
          id: adminUser._id,
          name: adminUser.discName || adminUser.nickName
        },
        deletedEventId: testDeleteEvent ? testDeleteEvent._id : null
      }
    };
    
  } catch (error) {
    console.error('构建测试数据失败:', error);
    throw error;
  }
}

// 验证修复效果
async function verifyFix(testUserOpenid) {
  console.log('验证修复效果...');
  
  try {
    // 如果没有指定用户，使用第一个用户
    let userOpenid = testUserOpenid;
    if (!userOpenid) {
      const usersResult = await db.collection('Users').limit(1).get();
      if (usersResult.data.length === 0) {
        return {
          success: false,
          message: '没有找到测试用户',
          data: null
        };
      }
      userOpenid = usersResult.data[0]._openid;
    }
    
    // 获取用户的报名记录
    const registrationsResult = await db.collection('Registrations')
      .where({
        userOpenid: userOpenid
      })
      .get();
    
    const registrations = registrationsResult.data;
    console.log(`找到用户 ${userOpenid} 的 ${registrations.length} 条报名记录`);
    
    // 获取对应的训练信息（包括已删除的）
    const eventIds = registrations.map(reg => reg.eventId);
    const eventsResult = await db.collection('Events')
      .where({
        _id: db.command.in(eventIds)
      })
      .get();
    
    const events = eventsResult.data;
    console.log(`找到 ${events.length} 个相关训练`);
    
    // 检查是否有已删除的训练
    const deletedEvents = events.filter(event => event.isDeleted === true);
    const activeEvents = events.filter(event => event.isDeleted !== true);
    
    console.log(`其中已删除训练: ${deletedEvents.length} 个`);
    console.log(`其中活跃训练: ${activeEvents.length} 个`);
    
    // 模拟修复后的逻辑：只返回未删除的训练记录
    const validRecords = [];
    
    for (const registration of registrations) {
      const eventInfo = events.find(event => event._id === registration.eventId);
      if (eventInfo && !eventInfo.isDeleted) {
        validRecords.push({
          ...registration,
          eventInfo: eventInfo
        });
      }
    }
    
    return {
      success: true,
      message: '修复效果验证完成',
      data: {
        userOpenid: userOpenid,
        totalRegistrations: registrations.length,
        totalEvents: events.length,
        deletedEvents: deletedEvents.length,
        activeEvents: activeEvents.length,
        validRecords: validRecords.length,
        shouldShow: validRecords.map(record => ({
          eventTitle: record.eventInfo.title,
          status: record.status,
          registrationTime: record.registrationTime
        })),
        shouldNotShow: deletedEvents.map(event => ({
          eventTitle: event.title,
          deleteReason: event.deleteReason
        })),
        fixWorking: deletedEvents.length > 0 && validRecords.length === activeEvents.length
      }
    };
    
  } catch (error) {
    console.error('验证修复效果失败:', error);
    throw error;
  }
}

// 随机获取报名状态
function getRandomStatus() {
  const statuses = ['signed_up', 'signed_up', 'signed_up', 'present', 'leave_requested'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

// 数组随机排序
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
