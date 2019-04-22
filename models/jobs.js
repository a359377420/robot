var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/blog');

var Jobs = new mongoose.Schema({
	username: String,
	password: String
});

//添加
//这里面的这个methods是固定的 代表添加实例方法
Jobs.methods.add = function(jobs, callback) {
	this.job_name = jobs.job_name;
    this.job_url = jobs.job_url;
    this.data = jobs.data;
	this.save(callback);
}

Jobs.methods.get = function(callback) {

	this.find(callback);
}

//这里面的jobs是数据库的一个集合
var Jobs = mongoose.model('jobs', Jobs);
module.exports = Jobs;