const SteamUser         = require('steam-user');
const SteamTotp         = require('steam-totp');
const SteamCommunity    = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const async             = require('async');
const MongoClient       = require('./package/MongoClient');
const Common            = require('../../helpers/common');
const uuidV4 = require('uuid/v4');
var log4js = require('log4js');
log4js.configure({
	appenders: {
		cheeseLogs: { type: 'file', filename: './data/logs/robot.log' },
		console: { type: 'console' }
	},
	categories: {
		cheese: { appenders: ['cheeseLogs'], level: 'error' },
		another: { appenders: ['console'], level: 'trace' },
		default: { appenders: ['console', 'cheeseLogs'], level: 'trace' }
	}
});
var logger = log4js.getLogger('normal');
//const config = require('./config.json');
/**
 * Steam机器人
 * 
 * getUserInventoryContents 获取用户库存
 * 
 * Inventory 库存对象
 */
class SteamBot {
    /**
     * 
     * @param {*登陆参数} logOnOptions 
     * @param {*用户配置} UserConfig 
     */
  constructor(logOnOptions, identitySecret, game_id, context_id, robot_id, socket, site_name, mongo_config) {
    this.common = new Common();
    this.robot_id = robot_id;
    this.client = new SteamUser();
    this.community = new SteamCommunity();
    this.manager = new TradeOfferManager({
      steam: this.client,
      community: this.community,
      language: 'en',
      pollInterval: 1000,//轮训器时间
      cancelTime:300000, //五分钟自动取消
      // pendingCancelTime:60000,
      cancelOfferCount:5, //最多五个任务，超过自动取消
      // cancelOfferCountMinAge:0,
      globalAssetCache:false,//装备缓存
      dataDirectory:'./data/robot/'
    });
    this.mongo_config = mongo_config;
    
    this.site_name = site_name;
    this.game_id = game_id;
    this.context_id = context_id;
    this.logOnOptions = logOnOptions;
    this.identitySecret = identitySecret;
    this.logOn(logOnOptions);
    this.JobEvents();
    logger.info(`机器人-identitySecret：${identitySecret}` . red);
    logger.info(`机器人-logOnOptions: ${JSON.stringify(logOnOptions)}` . red);
    //未登录状态
    this.RobotState = false;
    this.socket = socket;
    //存入订单数
    this.DepositCount = 0;
    //取出订单数
    this.WithdrawCount = 0;
  }
  /**
   * Steam 登陆 模拟浏览器
   * @param {*} logOnOptions 
   */
  logOn(logOnOptions) {
    this.client.logOn(logOnOptions);
    this.client.on('loggedOn', () => {
      logger.info('Logged into Steam in bots');
      this.client.setPersona(SteamUser.Steam.EPersonaState.Online);
      this.client.gamesPlayed(this.game_id);
    });

    this.client.on('webSession', (sessionid, cookies) => {
      logger.info('holding session...');
      this.manager.setCookies(cookies);
      
      this.community.setCookies(cookies);
      this.community.startConfirmationChecker(10000, this.identitySecret);
      //已登录
      this.RobotState = true;
    });
    // this.client.on('disconnected', (error, eresult) => {
    //   this.logOn(logOnOptions);
    // })
    // this.client.on('error',(error,result) => {
    //   this.logOn(logOnOptions);
    // });
  }
  /**
   * 轮询器 事件触发
   */
  JobEvents(){
    var THIS = this;
    /**
     * Offer管理
     */
    this.manager.on('newOffer', offer => {
      THIS.listenNewOffer(offer);
    });
    this.manager.on('sentOfferChanged', function(offer, oldState) {
      THIS.OfferChangeState(offer, oldState);
    });
    this.manager.on('pollData', function(pollData) {
      THIS.OfferPollData(pollData);
    });
    this.manager.on('receivedOfferChanged',function(offer, oldState){
      logger.info('存入事件');
      logger.info(offer);
      logger.info(oldState);
    });
    this.manager.on('sentOfferCanceled', function (offer, reason) {
      logger.info('取消订单 sentOfferCanceled # 01'.bgRed);
      logger.info(`${JSON.stringify(offer)}`.red);
      logger.info(`${JSON.stringify(reason)}`.green);
    });
    this.manager.on('sentPendingOfferCanceled', function (offer) {
      logger.info('取消订单 sentPendingOfferCanceled #02'.bgWhite);
      logger.info(`${JSON.stringify(offer)}`.red);
    });
    
    this.manager.on('sentPendingOfferCanceled',function(offer) {
      logger.info('发送offer');
      logger.info(offer);
    });
    /**
     * 社区
     */
    this.community.on('confKeyNeeded', function(tag, callback) {
      logger.info('确认需要重新生成Key'.magenta);
      var time = Math.floor(Date.now() / 1000);
      callback(null, time, SteamTotp.getConfirmationKey(this.identitySecret, time, tag));
    });
    this.community.on('newConfirmation',function(confirmation){
      logger.info('新的确认请求'.magenta);
    });
    this.community.on('confirmationAccepted',(confirmation) => {
      logger.info('自动确认交易'.magenta);
      logger.debug(confirmation);
      var mongodb_client = new MongoClient(this.mongo_config, (error, data ,mythis) => {
        if(error == false){
          logger.info(data);
        }else{
          logger.info('链接成功');
          mythis.getOfferInfo(confirmation.offerID, (error ,data) => {
            let return_data = this.common.api_return(202, '已创建交易,请确认交易！', {
              user_id: data.uid,
              offer_id: data.offer_id,
              tradeOffer_url: 'https://steamcommunity.com/tradeoffer/' + data.offer_id,
            });
            this.socket.withdraw(return_data);
          })
        }
      });
      var mongodb_client = null;
    });
    this.community.on('debug',(message) => {
      
      logger.info(`${message}` . magenta);
    });
    
  }
  /**
   * 新的订单
   * @param {*} offer 
   */
  listenNewOffer(offer){
    if ( offer.itemsToGive.length === 0 ){
      //offer.state
      //offer.id
      //state 7 修改交易
      if(offer.isOuroffer && offer.state != 7)
      {
        logger.info('listenNewOffer 新的offer'.red);
        logger.info(offer);
        //TODO 接收装备
        offer.accept((err, status) => {
          if (err) {
            logger.info(err);
          } else {
            logger.info(`Donation accepted. Status: ${status}.`);
          }
        });
      }
		} else {
			offer.decline(err => {
				if (err) {
					logger.info(err);
				} else {
					logger.info('拒绝修改交易.');
				}
			});
		}
  }
  /**
   * 订单状态变更
   * //state  2 交易状态变更  9 自动确认交易
   * offer.state  3 接受交易  || 4 修改交易 9拒绝交易  7 拒绝交易
   * @param {*} offer 类（Class） 
   * @param {*} state 状态
   */
  OfferChangeState(offer, state){
    //修改交易成功
    //offer.state == 3 修改为5
    // 
    //修改交易失败
    //offer.state == 4,9,7 修改为6
    // mongodb.updateState(6);
    logger.info('OfferChangeState 订单状态变更：' + state + '' . blue);
    logger.info(`Offer 状态 ：${offer.state}` . red);
    // offer.state == 3 && state == 2 存入状态
    // 2 7 对方拒绝交易
    // 2 4 对方修改交易
    // 2 6 超时取消
    if(offer.state == 3 && state == 2){
      
      offer.getExchangeDetails((err, status, tradeInitTime, receivedItems, sentItems) => {
        if (err) {
          //TODO 获取新的assetid失败，请保留失败数据，以便人工查验
          logger.info(`产生错误 ${err}` .bgRed);
          return;
        }
        // Create arrays of just the new assetids using Array.prototype.map and arrow functions
        //let newReceivedItems = receivedItems.map(item => item.new_assetid);
        let post_data = {
          state : state,
          offer : offer, //发送的offer数据
          newReceivedItems: receivedItems, // 接收装备的数据
          newSentItems : sentItems,//发送装备的数据
          robot_id : this.robot_id,
        };
        logger.info('开始请求'.red);
        logger.info(JSON.stringify(post_data));
        this.common.apiRequest('trade_offer/add', post_data, (error, json, respone) => {
            if(error === false){
              logger.info(respone);
              logger.info('trade_offer/add ： 接口异常！' . red);
            }else if(json){
              if(json.status == 1){
                logger.info('处理成功！'.green);
                if(json.data.isget == 1){
                  //取出
                  this.socket.robot_withdraw(json);
                }else{
                  //存入
                  this.socket.robot_deposit(json);
                }
                logger.info(json);
                logger.info('处理成功！'.green);
              }else{
                this.socket.robot_failure(json);
                logger.info(json);
                logger.info('处理失败');
              }
            }else{
              logger.info('接口无数据返回！');
            }
        });
      });
    }
    if( (offer.state == 6 && state == 2) || 
        (offer.state == 4 && state == 2) ||
        (offer.state == 7 && state == 2) )
    {
      logger.info('处理取消或拒绝交易' . bgCyan);
      let post_data = {
        state : state,
        offer : offer, //发送的offer数据
        robot_id : this.robot_id,
      };
      this.common.apiRequest('trade_offer/cancel', post_data, (error, json, respone) => {
        if(error === false){
          logger.warn(error);
          logger.error(respone);
          this.common.log(1, 0, offer.id, offer, post_data);
        }else if(json){
          if(json.status == 1){
            logger.info('处理成功！'.green);
            if(json.data.isget == 1){
              //取出 
              this.socket.robot_failure(json);
            }else{
              //存入
              this.socket.robot_failure(json);
            }
            logger.info(json);
            logger.info('处理成功！'.green);
          }else{
            this.socket.robot_failure(json);
            logger.info(json);
            logger.info('处理失败');
          }
        }else{
          logger.info('接口无数据返回！');
          this.common.log(2, 0, offer.id, offer, post_data);
        }
      });
      logger.info('开始请求'.red);
      logger.info(JSON.stringify(post_data));
    }
  }
  /**
   * 获取到数据状态
   * TODO ： 
   * @param {*} data 
   */
  OfferPollData(data){
    logger.info('定时器触发'.bgGreen);
    //logger.info(`${JSON.stringify(data)}` . green);
    //fs.writeFile('polldata.json', JSON.stringify(pollData), function() {});
  }

  
  /**
   * 存入
   * @param {*} partner 
   * @param {*} assetid 
   * @param {*} callback 
   */
  sendDepositTrade(partner, assetids, token, callback) {
    // partner 存入账号
    // token  存入账号token
    const offer = this.manager.createOffer(partner,token);
    logger.info('创建接收-offer' . cyan);
    this.manager.getUserInventoryContents(partner, this.game_id, this.context_id, true, (err, inv) => {
      if (err) {
        logger.info(`${err}` . cyan);
      } else {
        logger.info(`循环装备` . cyan);
        //是否发送offer
        let flag = false;
        assetids.forEach((assetid, index) => {
          let item = inv.find(item => item.assetid == assetid);
          logger.info('装备:'  + assetid + '' . cyan);
          //获取您的装备到机器人
          //查找您库存中的装备
          if (item) {
            flag = true;
            //将存入账号的装备加入到交易列表
            offer.addTheirItem(item);
            
          } else {
            logger.info(`装备未找到: ${assetid}` . cyan);
            callback('该装备已经不在您的库存中!',false, assetid);
            this.common.log(3, assetid, 0, offer, {});
            return;
          }
        });
        if(flag)
        {
          offer.setMessage('存入装备： 到 ' + this.site_name + ' 网站中! 确认码:' + uuidV4());
          offer.send((err, status) => {
            logger.info(`${offer.id}` . cyan);
            callback(err, status === 'sent' || status === 'pending', offer.id);
          });
        }else{
          logger.warn('交易失败');
          callback('系统发生未知错误或用户交易链接无效！!',false);
          return;
        }
      }
    });
    
  }
  /**
   * 取出
   * @param {*} partner //用户名
   * @param {*} credits //密码
   * @param {*} assetid 
   * @param {*} callback 
   */
  sendWithdrawTrade(partner, assetids, token, callback) {
    const offer = this.manager.createOffer(partner,token);
    logger.info('开始取出装备');
    logger.info(this.game_id);
    logger.info(this.context_id);
    this.manager.getInventoryContents(this.game_id, this.context_id, true, (err, inv) => {
      logger.info('获取机器人库存' . yellow);
      if (err) {
        logger.info(err);
      } else {
        //是否发送offer
        let flag = false;
        let break_flag = false;
        logger.info('循环装备' . yellow);
        //logger.info(JSON.stringify(inv));
        for(var assetid in assetids ){
          logger.info(`寻找装备：${assetid}` . yellow);
          let item = inv.find(item => item.assetid == assetid);
          if (item) {
            flag = true;
            // Check to make sure the user can afford the item here
            // 确认装备是该用户的
            // 确认装备是该用户赢取的
            logger.info(`装备-已找到：${assetid}`. yellow);
            // Example 假设机器人为fangun81 将 fangun81的装备加到 交易列表
            offer.addMyItem(item);
          }else {
            logger.info(`装备-未找到：${assetid}` . yellow);
            this.common.log(3, assetid, 0, offer, {});
            callback(`库存不足或指派错误,请联系客服补货！` , false, assetid);
            return false;
          }
        }
        if(flag)
        {
          offer.setMessage('取出装备: 到您的账户中！ 确认码:' + uuidV4() );
          offer.send((err, status) => {
            logger.info(`已取出-offer-id: ${(status === 'sent' || status === 'pending')} === ${offer.id} ` . yellow);
            callback(err, status === 'sent' || status === 'pending', offer.id);
          });
          this.community.checkConfirmations();
        }else{
          callback('系统发生未知错误或用户交易链接无效！' , false);
          return;
        }
      }
    });
  }
}

module.exports = SteamBot;
