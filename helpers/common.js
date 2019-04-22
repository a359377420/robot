var md5 = require('md5');
var request = require('request');
var reuqest_promise = require('request-promise');
var log4js = require('log4js');
var job = require('../models/jobs');
log4js.configure({
	appenders: {
		cheeseLogs: { type: 'file', filename: './data/logs/common.log' },
		console: { type: 'console' }
	},
	categories: {
		cheese: { appenders: ['cheeseLogs'], level: 'error' },
		another: { appenders: ['console'], level: 'trace' },
		default: { appenders: ['console', 'cheeseLogs'], level: 'trace' }
	}
});
var logger = log4js.getLogger('normal');

class Common {
    api_return(status, message, data)
    {
        return {
            'status' : status,
            'message' : message,
            'data'   : data
        };
    }
    failure_offer(user_id, offer_pk_id, offer_id, steam_id , assetids){
        let post_data = {
            'uid': user_id,
            '_id' : offer_pk_id,
            'offer_id' : offer_id,
            'steam_id' : steam_id,
            'assetids' : assetids,
        };
        logger.warn(JSON.stringify(post_data));
        this.apiRequest('trade_offer/failure', post_data, (error, json, response) => {

        })
    }
    apiRequest(apiName, params, callback) {
        const API_BASE_URL = 'http://v1.fangun8.com/index.php/api/';
        const APP_SECRET = "ZDVjZTAxODVkY2QyYjJlODNiZTQwZTI2MDMzMzkxM2Q=";
        const AUTH_KEY = "F044D95B745D06C3861AAF21438328C4";
        params.auth_key = AUTH_KEY;
        params.timestamp = new Date().getTime();
    
        var tmpParams = params;
        tmpParams.app_secret = APP_SECRET;
    
        var sortData = Object.keys(tmpParams).sort();
        var useData = {};
        for (var i = 0; i < sortData.length; i++) {
            useData[sortData[i]] = tmpParams[sortData[i]];
        }
        var useDataStr = md5(JSON.stringify(useData));
        params.sign = useDataStr;

        var options = {
            method: 'POST',
            uri: API_BASE_URL + apiName,
            headers: {
                "content-type": "application/json",
                'Connection' : 'keep-alive'
            },
            body: params,
            json: true // Automatically stringifies the body to JSON
        };
        
        reuqest_promise(options).then(function (data) {
                callback(null,data);
        }).catch(function (err) {
                logger.info('接口【' + apiName + '】出错！');
                callback(false,null,err);   
            });
        // request(options, function(error, response, data) {
        //     if (!error && response.statusCode == 200) {
        //         callback(null,data);
        //     } else {
        //         //this.log(apiName, API_BASE_URL + apiName, params);
        //         logger.info('接口【' + apiName + '】出错！');
        //         callback(false,null,response);   
        //     }
        // });
    }

    job(){
        var job = new job({
            'username' : '', 
            password : ''
        });
        job.add({
            job_name : 'job_name',
            job_url : 'job_url',
            data  : 'data'
        });
    }


    log(level, assetid, offer_id, raw_json, request_json){
        let post_data = {
            level : level,
            assetid : assetid,
            offer_id : offer_id,
            raw_json : JSON.stringify(raw_json),
            request_json : JSON.stringify(request_json)
        };
        this.apiRequest('steam_bot_log/add', post_data, (error, json, respone) => {
            logger.info('记录日志成功' .bgWhite);
        });
    }

    zhongwen_2_unicode (str, callback) {
        var res = [];
        for (var i = 0; i < str.length; i++) {
            res[i] = ("00" + str.charCodeAt(i).toString(16)).slice(-4);
        }
        callback("\\u" + res.join("\\u"));
    }
}

module.exports = Common;