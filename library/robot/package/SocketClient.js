const io = require('socket.io-client');
const colors = require("colors");
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
class SocketClient{
    constructor(url,robot_id){
        /**
         * 实例化socket
         */
        this.socket_client = io.connect(url, { 
            reconnect: true ,
            forceNew: true,
            transports: ['websocket']
        });
        logger.info('开始连接socket' . red);
        //绑定连接上服务器之后触发的数据
        this.socket_client.on('connect', function (socket) {
            logger.info(`[机器人-${robot_id}]： 发起链接socket!` . red);
            this.emit('logined', {userid : 'robot_' + robot_id,usertype : 1});//触发服务器绑定的login事件
        });
        this.socket_client.on('loging',(data) => {
            logger.info(`[服务器-向-机器人-${robot_id}]： ${data}` . red);
        });
    }
    /**
     * 生成交易链接
     * @param {*f} socket_data 
     */
    // 存入交易链接
    deposit(socket_data){
        this.socket_client.emit('deposit',socket_data);
    }
    // 取出交易链接
    withdraw(socket_data){
        this.socket_client.emit('withdraw',socket_data);
    }
    // 生成交易链接失败
    failure(socket_data){
        this.socket_client.emit('failure',socket_data);
    }
    /**
     * 监听到新的请求，通知前端订单完成状态
     * @param {*} socket_data 
     */
    // 存入完成
    robot_deposit(socket_data){
        this.socket_client.emit('robot_deposit',socket_data);
    }
    // 取出完成
    robot_withdraw(socket_data){
        this.socket_client.emit('robot_withdraw',socket_data);
    }
    // 取消或异常
    robot_failure(socket_data){
        this.socket_client.emit('robot_failure',socket_data);
    }

}
module.exports = SocketClient;
