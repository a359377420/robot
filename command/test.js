


const MongoClient       = require('../library/robot/package/MongoClient');
var HelperCommon = require('../helpers/common');
var log4js = require('log4js');
log4js.configure({
	appenders: {
		cheeseLogs: { type: 'file', filename: './data/logs/mongo.log' },
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
    DB_CONN_STR: 'mongodb://47.52.248.196:27017',
    DB_PREFIX: 'fan_',
    database: 'fangun8'
};
var common = new HelperCommon();
const mongodb = new MongoClient(mongo_config, (error, database, mythis) => {
	if (error == false) {
		logger.info(database);
	} else {
        logger.info('链接成功');
        // setInterval(function(){
        //     mythis.saveNotice('failure',79,common.api_return(1,'创建订单失败！', {}))
        // },1000);
        mythis.getOfferInfo(2906541443,(error,result) => {
            logger.info(result);
        });
	}
});

