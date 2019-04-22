const request = require('request');

const  API_URL = 'http://v1.fangun8.com/api';
const  APP_SECRET   = "ZDVjZTAxODVkY2QyYjJlODNiZTQwZTI2MDMzMzkxM2Q=";
const  AUTH_KEY     = "F044D95B745D06C3861AAF21438328C4";

/**
 * 请求API类 封装
 */
class Api{
    constructor(apiName){
        this.action_name = apiName;
    }
    /**
     * post 获取方式
     * @param {*} params 
     */
    post(params){
        params.auth_key = AUTH_KEY;
        params.timestamp = new Date().getTime();
        var tmpParams = params;
        tmpParams.app_secret = APP_SECRET;

        var sortData = Object.keys(tmpParams).sort();
        var useData = {};
        for(var i = 0; i<sortData.length; i++ )
        {
            useData[sortData[i]] = tmpParams[sortData[i]];
        }

        var useDataStr = md5(JSON.stringify(useData));

        params.sign = useDataStr;
        let request_data = {
            url: API_URL + '/' + this.action_name,
            method: "POST",
            json: true,
            headers: {
                "content-type": "application/json",
            },
            body: params
        };
        request(request_data, function(error, response, data) {
            if (!error && response.statusCode == 200) {
                return data;
            } else {
                return false;
            }
        });
    }
}
module.exports = Api;