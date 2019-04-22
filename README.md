auto update

status 
	0  未处理
	1  正在处理 通知socket
	2  拒绝交易 (装备不存在) 通知socket 拒绝
	3  交易异常
	4  已生成交易，等待用户确认 通知socket offer 链接
	5  已确认交易
	6  交易失败 (修改交易, 拒绝交易)
	

logined  登录 {

}
timestatus 参加 {

}
newroom 新建房间 任意匹配装备 {

}

gamestatus 开始翻硬币  
	{
		"gamestatus": obj.gamestatus,
		"roomid": obj.roomid,
		"timeout": timeout,
		"ctime": ctime,
	}
room_msgs  房间总览 {

}
alljoingamemsgs 参加游戏总计改变 {

}


取房间列表

计算房间价值

	
	