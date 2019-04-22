
const client = require('mongodb').MongoClient;
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

class MongoClient {
    constructor(config, callback) {
        this.database = null;
        this.config = config;
        
        client.connect(config.DB_CONN_STR, (err, mongo_client) => {
            if (err) {
                logger.info('mongo链接错误！');
                callback(false, err);
            }else{
                
                this.database = mongo_client.db(this.config.database);
                callback(null,this.database,this);
            }
            //mongo_client.db(typeof  String(this.config.database).toString())
            // logger.info(mongo_client);
            
        });
    }
    getOfferInfo(off_id, callback){
        var collection = this.database.collection(this.config.DB_PREFIX + 'trade_offer');
        let where = {
            offer_id : `${off_id}`,
        };
        collection.findOne(where,  { "sort": [['offer_time', 'asc']] }, (err, result) => {
            if (err) {
                logger.info('Error:1');
                logger.info(err);
                callback(false,result);
            } else {
                if (result != null) {
                    callback(null, result);
                }
            }
        });
    }
    readerNotice(user_id, callback){
        var collection = this.database.collection(this.config.DB_PREFIX + 'trade_notice');
        let where = {
            user_id : user_id,
        };
        collection.find(where).toArray(function(err, results) {
            if(err){
                callback(err,null);
            }
            callback(null,results);
        });
    }
    saveNotice(type, user_id, data){
        var collection = this.database.collection(this.config.DB_PREFIX + 'trade_notice');
        collection.insert({
            type : type,
            user_id : user_id,
            data : data,
            reader_count : 0,
            state : 0,
        });
    }

    updateState(state, result, tradeOffer, callback) {
        
        var collection = this.database.collection(this.config.DB_PREFIX + 'trade_offer');
        //设置状态为4
        collection.update(
            { '_id': result._id },
            { $set: { status: state, offer_id: tradeOffer } },
            (err, docs) => {
                logger.info('更新offerID');
                callback(err,docs)
            }
        );
    }

    findOffer(robot_id, callback) {
        var where = { 
            "robot_id" : parseInt(robot_id),
            "status" : 0,
            //"robot_id": robot_id,
            // "banbot": { 
            //     "$nin": [robot_id], 
            //     $exists: true 
            // } 
        };
        
        var collection = this.database.collection(this.config.DB_PREFIX + 'trade_offer');
        
        collection.findOne(
            where, 
            { "sort": [['offer_time', 'asc']] },
            (err, result) => {
                if (err) {
                    logger.info('Error:1');
                    logger.info(err);
                } else {
                    if (result != null) {
                        let update = {
                            '_id': result._id
                        };
                        //设置状态为1
                        collection.update(
                            update, 
                            { $set: { status: 1 } }, 
                            (err, docs) => {
                                if (err) {
                                    logger.info('Error:0');
                                } else {
                                    logger.info('领取到任务，更新表状态！');
                                    callback(result);
                                }
                            }
                        );

                    }
                }
            }
        );
    }

}
module.exports = MongoClient;