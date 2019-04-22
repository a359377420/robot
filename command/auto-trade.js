const async             = require('async');
const colors            = require("colors");
const log4js = require('log4js');
log4js.configure({
	appenders: {
		cheeseLogs: { type: 'file', filename: './data/logs/cheese.log' },
		console: { type: 'console' }
	},
	categories: {
		cheese: { appenders: ['cheeseLogs'], level: 'error' },
		another: { appenders: ['console'], level: 'trace' },
		default: { appenders: ['console', 'cheeseLogs'], level: 'trace' }
	}
});
const logger = log4js.getLogger('normal');
const CommonHelper = require('../helpers/common');
const io = require('socket.io-client');
const common = new CommonHelper();

init_auto_trade = function(){
	// 获取账号列表
	// 开启线程
	// 链接socket
	
	/**
	 * 加入房间
	 *    匹配装备
	 * 		真实用户房间
	 *     		判断是否超出3分钟
	 * 		机器人房间
	 * 			直接参加 
	 *    timestatus 参加房间 锁定
	 * 	  请求接口 joinroom
	 * 	  gamestatus 开始翻硬币
	 */
	/**
	 * 新建房间
	 * 	放入限制范围内装备
	 * 	newroom 
	 * 
	 */
	var socket_client = io.connect('http://v1.fangun8.com:8888', { 
		reconnect: true,
		transports: ['websocket'] 
	});
}

