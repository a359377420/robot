const SteamUser         = require('steam-user');
const SteamTotp         = require('steam-totp');
const SteamCommunity    = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const mysql             = require('mysql');
var program = require('commander');
program
  .version('0.0.1')
  .option('-id, --robot_id', '机器人ID')
  .parse(process.argv);
const async             = require('async');
const SteamBot          = require('../library/robot/index');
const Common            = require('../helpers/common');
const SocketClient      = require('../library/robot/package/SocketClient');
const MongoClient       = require('../library/robot/package/MongoClient');
const colors            = require("colors");

var log4js = require('log4js');
log4js.configure({
	appenders: {
		cheeseLogs: { type: 'file', filename: './data/logs/socket-bot.log' },
		console: { type: 'console' }
	},
	categories: {
		cheese: { appenders: ['cheeseLogs'], level: 'error' },
		another: { appenders: ['console'], level: 'trace' },
		default: { appenders: ['console', 'cheeseLogs'], level: 'trace' }
	}
});
var logger = log4js.getLogger('normal');
const mongo_config = {
  DB_CONN_STR :'mongodb://127.0.0.1:27017',
  DB_PREFIX   : 'fan_',
  database    : 'fangun8',
  // username    : 'rootw',
  // password    : 'ZOgNq6yH',
};
const mongodb = new MongoClient(mongo_config, (error, data) => {
  if(error == false){
    logger.info(data);
  }else{
    logger.info('链接成功');
  }
});

// const mongodb = new MongoClient({
//   DB_CONN_STR :'mongodb://rootw:ZOgNq6yH@dds-j6c00c969a9147b41.mongodb.rds.aliyuncs.com:3717/fangun8',
//   DB_PREFIX   : 'fan_',
//   database    : 'fangun8',
//   username    : 'rootw',
//   password    : 'ZOgNq6yH',
// },(error, data) => {
//   if(error == false){
//     console.log(data);
//   }else{
//     console.log('链接成功');
//   }
// });

/**
 * arguments 机器人参数
 */
var arguments = process.argv.splice(2);
logger.info(arguments);
//机器人ID 绑定账号
var robot_id = arguments[0];

if(robot_id == undefined){
  logger.info(arguments);
  logger.info('请传入robot_id！！！' . red);
  process.exit();
}
//游戏ID
var game_id = null;
//交易方式
var contextid = 2;

var common = new Common();
var config = null;
var logOnOptions = null;
var RobotClient = null;
logger.info('测试数据');
const socket = new SocketClient('http://v1.fangun8.com:8888',robot_id);
/**
 * 初始化机器人配置
 */
var init_steam_bot = async function () {
  let post_data = {
    'robot_id': robot_id,
  };
  await common.apiRequest('steam_bot/robot_info', post_data, (error, json, response) => {
    
    if (!json) {
      logger.info('机器人-初始化错误的请求数据');
      logger.info(json);
      process.exit();
      return;
    }
    config = json.data;
    logger.info(json);
    logOnOptions = {
      accountName: config.username,
      password: config.password,
      twoFactorCode: SteamTotp.generateAuthCode(config.sharedsecret)
    };
    game_id = config.appid;
    var site_name = 's8game.com';
    RobotClient = new SteamBot(logOnOptions, config.idsecret, game_id, 2, robot_id , socket, site_name, mongo_config);
  });


  // /**
  //  * 实例化机器人
  //  * 账号密码
  //  */
  //startJob();
  
  setInterval(startJob, 1000);
}

/**
 * 获取一条交易数据
 * @param {*} callback 
 */
var getOneOffer = function (callback) {
  mongodb.findOffer(robot_id,(result) => {
    callback(result);
  });
}
/**
 * 开始任务
 */
var startJob = async function () {
  if(RobotClient != null && RobotClient.RobotState == true){
    getOneOffer(function (result) {
      logger.info('机器人-接收数据');
      if (result != false && result != null) {
        var record_id = result._id;
        logger.info("机器人-开始处理任务！");
        if (result.isget == 0) {
          deposit(result);
        } else {
          withdraw(result);
        }
      } else {
        logger.info("机器人-返回的数据异常！");
        db.close();
      }
    });
  }else{
    logger.info('等待机器人登录...');
  }

}
/**
 * 存入到机器人
 * @param {*} result 
 */
var deposit = (result) => {
  logger.info("机器人-开始处理任务接收装备....");
  logger.info(config);
  let partner = result.steamid;
  let assetids = result.assetids;
  let token = result.token;
  let user_id = result.uid;
  logger.info(result);
  RobotClient.sendDepositTrade(partner, assetids, token,
    (err, success, tradeOffer) => {
      if (err && !success) {
        let data = common.api_return(-404, err, {
          user_id: result.uid,
          result:result,
        });
        logger.error(err);
        logger.warn(JSON.stringify(result));
        //交易错误 ，取消订单
        common.failure_offer(result.uid, result._id, result.offer_id, result.steamid, result.assetids);
        socket.failure(data);
        common.log(5, 0, tradeOffer, data, {});
        //交易异常
        mongodb.updateState(3, result, tradeOffer, (err, docs) => {});
      } else {
        let data = common.api_return(200, '已创建交易,请确认交易！', {
          user_id: result.uid,
          '_id': result._id,
          offer_id: tradeOffer,
          tradeOffer_url: 'https://steamcommunity.com/tradeoffer/' + tradeOffer,
        });
        logger.info('https://steamcommunity.com/tradeoffer/' + tradeOffer );
        mongodb.updateState(4, result, tradeOffer, (err, docs) => {
          if (err) {
            let data = common.api_return(-601, '交易失败！', {
              user_id: result.uid,
              '_id': result._id
            });
            logger.info(`更新失败`);
            logger.debug(data);
            common.log(4, 0, tradeOffer, data, {});
            socket.failure(data);
            common.failure_offer(result.uid, result._id, result.offer_id, result.steamid, result.assetids);
          } else {
            socket.deposit(data);
            logger.info(`机器人-更新订单中的订单ID！`);
            logger.debug(data);
          }
        });
      }
    });
}
/**
 * 取出到用户
 * @param {*} result 
 */
var withdraw = (result) => {
  let partner = result.steamid;
  let assetids = result.assetids;
  let token = result.token;
  RobotClient.sendWithdrawTrade( partner, assetids, token, (err, success, tradeOffer) => {
    if (err && !success) {
      let data = common.api_return(-404, err, {
        user_id: result.uid,
        result:result,
      });
      logger.info(`取出失败： ${tradeOffer}` . red);
      logger.info(err);
      logger.info(success);
      logger.info(tradeOffer);
      common.log(5, 0, tradeOffer, data, {});
      logger.debug(JSON.stringify(result));
      common.failure_offer(result.uid, result._id, result.offer_id, result.steamid, result.assetids);
      socket.failure(data);
      mongodb.updateState(3, result, tradeOffer, (err, docs) => {});
    } else {
      let data = common.api_return(200, '已创建交易,等待机器人确认交易链接！', {
        user_id: result.uid,
        offer_id: tradeOffer,
        //tradeOffer_url: 'https://steamcommunity.com/tradeoffer/' + tradeOffer,
      });
      
      logger.info(`https://steamcommunity.com/tradeoffer/${tradeOffer}` . red);
      mongodb.updateState(4,result, tradeOffer, (err, docs) => {
        if (err) {
          let data = common.api_return(-601, '交易失败！', {
            user_id: result.uid,
            '_id': result._id
          });
          common.log(4, 0, tradeOffer, data, {});
          socket.failure(data);
          common.failure_offer(result.uid, result._id, result.offer_id, result.steamid, result.assetids);
        } else {
          logger.info('data');
          socket.withdraw(data);
          logger.info(`机器人-更新订单中的订单ID！: ${tradeOffer}` . pink);

        }
      });
    }
  });
};

init_steam_bot();
