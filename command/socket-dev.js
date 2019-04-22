var request = require('request');
var md5 = require('md5');
var colors = require('colors');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http,{
	upgrade:false,
	transports: ['websocket']
	//"path" : '/socket.io',
	// "serveClient": true ,
	// "transports":['websocket'],
	// "origins" : '*',
	// "pingInterval": 1000,
	// "pingTimeout": 2000,
  	// "cookie": false
});
const MongoClient       = require('../library/robot/package/MongoClient');
var HelperCommon = require('../helpers/common');
const mongo_config = {
	DB_CONN_STR: 'mongodb://47.52.248.196:27017',
	DB_PREFIX: 'fan_',
	database: 'fangun8'
};
const mongodb = new MongoClient(mongo_config, (error, data) => {
	if (error == false) {
		logger.info(data);
	} else {
		logger.info('链接成功');
	}
});
var log4js = require('log4js');
log4js.configure({
	appenders: {
		cheeseLogs: { type: 'file', filename: './data/logs/socket-dev.log' },
		console: { type: 'console' }
	},
	categories: {
		cheese: { appenders: ['cheeseLogs'], level: 'error' },
		another: { appenders: ['console'], level: 'trace' },
		default: { appenders: ['console', 'cheeseLogs'], level: 'trace' }
	}
});
var logger = log4js.getLogger('normal');
var common = new HelperCommon();

app.use(express.static('views'));
http.listen(8888, '0.0.0.0', function () {
	logger.info('listening on *:8888');
});

var userSoclist = [];
var userInfolist = [];

io.on('connection', function (socket) {
	
	//监听新用户加入
	socket.on('logined', function (obj) {
		logger.info('开始登陆' . red);
		logger.info(`${JSON.stringify(obj)}` . bgCyan);
		if (obj.userid != undefined) {
			if (obj.usertype != undefined && obj.usertype == 1) {
				logger.info(`机器人已连接:${obj.userid}` . red);
				socket.emit('loging', common.api_return(1, '机器人【' + obj.userid + '】接入socket'));
			} else { 
				//正常用户
				logger.info(`用户请求连接:${obj.userid}` . red);
				let post_data = {
					userid: obj.userid,
					authchar: obj.authchar
				};
				
				logger.info(post_data);
				common.apiRequest('rooms/islogin', post_data, function (error,result) {
					if (result.status == 1) {
						userSoclist.forEach(function(v,i){
							if(v.userid == result.userid){
								userSoclist.splice(i,1)
							}
						})
						userSoclist.push({
							'userid': result.userid,
							'steam_id': result.steam_id,
							'trade_links': result.trade_links,
							'socket_id': socket.id,
							'authchar': post_data.authchar
						});
						logger.info(`用户已连接:${obj.userid}` . green);
						common.zhongwen_2_unicode('登录成功', function (message) {
							socket.emit('loging', common.api_return(1, message, result));
						});
						mongodb.readerNotice(obj.userid,(error,results) => {
							if(error){
								logger.error(error);
							}else{
								logger.info('重发消息');
								results.forEach(function(v,i){
									logger.debug(v);
									io.to(socket.id).emit(v.type, v.data);
								});
							}
						});
					} else {
						logger.info(obj);
						logger.info(`用户连接失败:${obj.userid}` .yellow);
						common.zhongwen_2_unicode('未登录或登录失效，请先前往登录', function (message) {
							socket.emit('loging', common.api_return(-999, message, result));
						});
					}
				});
			}
		}else{
			logger.info('登陆异常的请求！');
		}
	});
	//30秒倒计时
	socket.on('timestatus', function (obj) {
		// logger.info(join_room_user[obj.roomid]);
		// if(join_room_user[obj.roomid]==''){
			// logger.info(`此房间无人参加` . green);
			// join_room_user[obj.roomid]=obj.user_id
			if (obj.type) {
				common.apiRequest('rooms/jointime', { "uid": obj.userid,"authchar":obj.authchar,"type": true }, function (error, res) {
					logger.info(res)
					if (res.status == 1) {
						io.emit('timestatuss', {
							"uid": obj.userid,
							"timestatus": obj.timestatus,
							"roomid": obj.roomid,
							"timeout": obj.timeout
						});
					}
					 else {
						io.emit('message', {
							'title': res.msg,
							'status': -1,
							'state': 0
						})
					}
				})
			} else {
				common.apiRequest('rooms/jointime', { "roomid": obj.roomid,"authchar":obj.authchar, "uid": obj.userid}, function (error,res) {
					logger.info(res)
					if (res.status == 1) {
						io.emit('timestatuss', {
							"uid": obj.userid,
							"timestatus": obj.timestatus,
							"roomid": obj.roomid,
							"timeout": obj.timeout
						});
					}else if(res.status==-1){
						io.emit('room_error_msg', {
						"uid": res.data.uid,
						"roomid": res.data.roomid
					})
					}
					 else {
						io.emit('message', {
							'title': res.msg,
							'status': -1,
							'state': 0
						})
					}
				})
			}
		// }
		// else{
			// logger.info(`此房间有人参加` . yellow);
			// io.emit('room_error_msg', {
				// "uid": obj.userid,
				// "roomid": obj.roomid
			// })
		// }
		
	});

	//游戏动画倒计时
	socket.on('gamestatus', function (obj) {
		logger.info(obj)
		var timeout = 11
		var ctime = 10
		io.emit('gamestatuss', {
					"gamestatus": obj.gamestatus,
					"roomid": obj.roomid,
					"timeout": timeout,
					"ctime": ctime,
				});
		var sockettimer = setInterval(function () {
			timeout--
			ctime--
			if (ctime >=0) {
				io.emit('gamestatuss', {
					"gamestatus": obj.gamestatus,
					"roomid": obj.roomid,
					"timeout": timeout,
					"ctime": ctime,
				});
			} else {
				clearInterval(sockettimer)
			}
		}, 1000)
		setTimeout(function () {
			
			let post_data = { "roomid": obj.roomid };
			logger.warn(post_data);
			common.apiRequest('trun_coin/drawcoin', post_data, function (error, json, response) {
				if(error){
					logger.info({ "roomid": obj.roomid })
					logger.error('接口调用出错');
				}else{
					logger.info('开始翻硬币' . bgMagenta);
					if(json == null){
						trun_get(post_data);
					}else{
						if (json.status == 1) {
							io.emit("gamewinners", { "winner": json.data.winner, "roomid": obj.roomid })
							flag = true;
							logger.info(`${JSON.stringify(json)}` . bgCyan);
							logger.info('翻硬币成功' . bgMagenta);
						}else{
							io.emit('message', {
								'title': json.msg,
								'status': -1,
								'state': 0
							})
							logger.info('翻硬币失败 -- start' . bgMagenta);
							logger.info(`${JSON.stringify(json)}` . bgCyan);
							logger.info('翻硬币失败 -- end' . bgMagenta);
							trun_get(post_data);
						}
					}
					
				}
			})
		},9000)
	});
	//参见游戏后房间信息
	socket.on('room_msgs',function(obj){
		logger.info(obj)
		io.emit("room_msg", obj)
	})
	//聊天室
	socket.on('chatmsg', function (obj) {
		logger.info(obj)
		common.apiRequest('user_chat/addchat', obj, function (error,res) {
			if (res.status == 1) {
				io.emit("chatmsgs", res.data)
			}
			 else {
				io.emit('message', {
					'title': res.msg,
					'status': -1,
					'state': 0
				})
			}
		})
	})
	//新建房间
	socket.on('newroom', function (obj) {
		logger.info('新建房间 -- start'.bgCyan);
		common.apiRequest('rooms/coinroom', obj, function (error,res) {
			if (res.status == 1) {
				io.emit("newrooms", res.data)
				io.emit("allgamemsg", {
					"total_item": res.data.item.length,
					"total_price": res.data.price,
				})
				logger.info(`${JSON.stringify(res)}` . bgGreen);
				logger.info('新建房间 -- end'.bgCyan);
			}else{
				io.emit('message', {
					'title': res.msg,
					'status': -1,
					'state': 0
				})
				logger.info('新建房间失败 -- start'.bgCyan);
				logger.info(`${JSON.stringify(res)}` . bgRed);
				logger.info('新建房间失败 -- end'.bgCyan);
			}
		})
	})
	//参加游戏总计改变
	socket.on('alljoingamemsgs', function (obj) {
		logger.info(`当前饰品总价值：${JSON.stringify(obj)}` . bgYellow);
		io.emit("alljoingamemsg", {
			"total_item": obj.total_item,
			"total_price": obj.total_price
		})
	})
	//删除房间总计改变
	socket.on("delete_gamemsgs",function (obj){
		logger.info(`当前饰品总价值：${JSON.stringify(obj)}` . bgYellow);
		var flag=true
		if(flag){
			io.emit("delete_gamemsg", {
				"delete_item": obj.delete_item,
				"delete_price": obj.delete_price
			})
			flag=false
		}
		
	  })
	/**
	 * 向机器人发送请求
	 */
	//饰品存入接口
	socket.on('jewellery', function (obj) {
		let item = userSoclist.find(item => item.socket_id == socket.id);
		if (item != undefined && item.hasOwnProperty('steam_id')) {
			let request_data = {
				userid: obj.user_id,
				items: obj.items,
				steam_id: item['steam_id'],
				trade_links: item['trade_links']
			};
			logger.info(`存入请求:\n ${JSON.stringify(request_data)}` .bgYellow);
			common.apiRequest('trade_offer/importcheck', request_data, function (error,result) {
				if (result.status == 1) {
					//向机器人发送消息
					io.to(socket.id).emit('deposit', result.data);
				} else {
					common.zhongwen_2_unicode(result.message, function (message) {
						io.to(socket.id).emit('warehouse_failure', common.api_return(-1, message, result));
					});
				}
			})
		} else {
			//客户端离线，无需发送
			logger.info(item);
			common.zhongwen_2_unicode('请登录socket后重试！', function (message) {
				io.to(socket.id).emit('warehouse_failure', common.api_return(-999, message,[]));
			});
			
		}
	});
	//饰品取出
	socket.on('jewellery_take_out', function (obj) {
		let item = userSoclist.find(item => item.socket_id == socket.id);
		if (item != undefined && item.hasOwnProperty('steam_id')) {
			if(obj.user_id == undefined){
				common.zhongwen_2_unicode('未登录，请重试', function (message) {
					io.to(socket.id).emit('loging', common.api_return(-999, message, result));
				});
				return false;
			}
			let request_data = {
				user_id: obj.user_id,
				jewellery_ids: obj.ids,
				steam_id: item['steam_id'],
				trade_links: item['trade_links']
			};
			logger.info(JSON.stringify(request_data));
			common.apiRequest('trade_offer/take_out', request_data, function (error,result) {
				if (result.status == 1) {
					
					io.to(socket.id).emit('withdraw', result.data);
				} else {
					common.zhongwen_2_unicode(result.message, function (message) {
						io.to(socket.id).emit('warehouse_failure', common.api_return(-1, message, result));
					});
				}
			})
		} else {
			common.zhongwen_2_unicode('未找到登录的数据！', function (message) {
				io.to(socket.id).emit('loging', common.api_return(-1, message, result));
			});
		}
	});
	/**
	 * 向机器人发送请求
	 */
	
	/**
	 * 机器人发送过来的请求
	 */

	// 创建链接失败
	socket.on('failure', (json) => {
		if(json.status != undefined){
			let item = userSoclist.find(item => item.userid == json.data.user_id);
			if(item){
				logger.debug(item);
				common.zhongwen_2_unicode(json.message, function (message) {
					socket.to(item.socket_id).emit('warehouse_failure', common.api_return(json.status, message, json));
				});
			}else{
				logger.info('操作失败消息：');
				logger.info(item);
				mongodb.saveNotice('failure', json.data.user_id, json);
				//mongodb.saveNotice(type , data);
			}
		}
	})
	// 存入链接已生成
	socket.on('deposit', (json) => {
		let socks_id = 0;
		if (json.status == 200) {
			let item = userSoclist.find(item => item.userid == json.data.user_id);
			if(item){
				common.zhongwen_2_unicode('您的装备已存入，请确认交易链接', function (message) {
					socket.to(item.socket_id).emit('warehouse', common.api_return(200, message, json.data));
				});
			}else{
				mongodb.saveNotice('deposit', json.data.user_id, json);
				logger.info('存入操作：用户已断线或登录多个socket无法通知'.red);
				logger.info(json);
			}
		} else {
			logger.info(`${JSON.stringify(json)}`.yellow);
		}
	});
	// 取出 链接已生成
	socket.on('withdraw', (json) => {
		let socks_id = 0;
		if (json.status) {
			let item = userSoclist.find(item => item.userid == json.data.user_id);
			if(item){
				common.zhongwen_2_unicode(json.message, function (message) {
					socket.to(item.socket_id).emit('warehouse', common.api_return(json.status, message, json.data));
				});
			}else{
				logger.info('取出操作：用户已断线或登录多个socket无法通知'.red);
				logger.info(json);
				mongodb.saveNotice('withdraw', json.data.user_id, json);
			}
		} else {
			logger.info(`${JSON.stringify(json)}`.yellow);
		}
	});

	/**
	 * 机器人发送过来的请求
	 */


	/**
	 * 机器人 完成交易
	 */
	//存入成功时发送的数据
	socket.on('robot_deposit', (json) => {
		if(json.status == 1){
			let item = userSoclist.find(item => item.userid == json.data.user_id);
			if(item){
				common.zhongwen_2_unicode(json.message, function (message) {
					socket.to(item.socket_id).emit('warehouse_succefully', common.api_return(json.status, message, json.data));
				});
				
			}else{
				logger.info('存入成功：用户已断线或登录多个socket'.red);
				logger.info(json);
				mongodb.saveNotice('robot_deposit', json.data.user_id, json);
			}
		}
	});
	//取出成功时发送的数据
	socket.on('robot_withdraw', (json) => {
		if(json.status == 1){
			let item = userSoclist.find(item => item.userid == json.data.user_id);
			if(item){
				common.zhongwen_2_unicode(json.message, function (message) {
					socket.to(item.socket_id).emit('warehouse_succefully', common.api_return(json.status, message, json.data));
				});
			}else{
				logger.info('取出成功：用户已断线或登录多个socket'.red);
				logger.info(json);
				mongodb.saveNotice('robot_withdraw', json.data.user_id, json);
			}
		}
	});
	//最终接收到offer 失败的消息
	socket.on('robot_failure', (json) => {
		logger.info('交易失败:'.bgYellow);
		logger.info(json);
		if(json.status == 1){
			let item = userSoclist.find(item => item.userid == json.data.user_id);
			if(item){
				logger.debug(item);
				common.zhongwen_2_unicode(json.message + ',' + json.data.state , function (message) {
					socket.to(item.socket_id).emit('warehouse_failure', common.api_return(json.status, message, json));
				});
			}else{
				logger.info('失败消息：用户已断线或登录多个socket'.bgCyan);
				logger.info(json);
				mongodb.saveNotice('robot_failure', json.data.user_id, json);
			}
		}else{
			logger.info('失败offer,错误数据');
		}
		// io.emit('message', data);
	});
	/**
	 * 机器人 完成交易
	 */

	// socket.on('message', function (msg) {
	// 	io.emit('message', msg);
	// });

	socket.on('disconnect', function(){
		let item = userSoclist.find(item => item.socket_id == socket.id);
		logger.info(`客户端断开连接: ${socket.id}` .red);
		userSoclist.forEach(function(v,i){
			if(v.socket_id == socket.id){
				userSoclist.splice(i,1)
			}
		})
		logger.info(userSoclist)
		if (item) {
			logger.info('receive disconnect event');
			common.apiRequest('rooms/jointime', { "uid": item.userid, "authchar":item.authchar, "type": true }, function (error,res) {
				if (res.status == 1) {
					logger.info(res)
					logger.info(res.roomid)
					var nowtime = Date.parse(new Date())
					nowtime = nowtime / 1000
					io.sockets.emit('timestatuss', {
						"uid": item.userid,
						"timestatus": '010',
						"roomid": res.roomid,
						"timeout": 0,
						"jointime": nowtime
					})
				}
				 else {
					io.emit('message', {
						'title': res.msg,
						'status': -1,
						'state': 0
					})
				}
			})
		}
	});

});


trun_get = function(post_data){
	common.apiRequest('trun_coin/get', post_data, (er, data, res) => {
		if (data.status == 1) {
			io.emit("gamewinners", { "winner": data.data.winner, "roomid": obj.roomid })
			flag = true;
			logger.info(`${JSON.stringify(data)}` . bgCyan);
			logger.info('翻硬币成功' . bgMagenta);
		}
	});
}
